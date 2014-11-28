if (typeof(AC) == 'undefined') { AC = {}; }

AC.SwapView = Class.create({
	
	_view: null,
	currentContent: null,
	delegate: null,
	
	initialize: function(view) {
		if(typeof view === "string") {
			this._viewId = view;
		}
		else {
			this._view = $(view);
		}
		if(this._view) {
			var childNodes = this._view.childNodes, aChildNode;
			while(aChildNode = childNodes[0]) {
				this._view.removeChild(aChildNode);
			}
			//Doing .innerHTML = ""; empty nodes we already had a handle on in the section
			//this._view.innerHTML = "";
			this._view.addClassName('swapView');
		}
	},
	view: function() {
		if(!this._view) {
			this._view = $(this._viewId);
			if(this._view) {
				this._view.innerHTML = "";
				this._view.addClassName('swapView');
			}
		}
		return this._view;
	},
	setDelegate: function(delegate) {
		this.delegate = delegate;
	},
	
	setContent: function(content) {
		
		if (content == this.currentContent) {
			return;
		}
		
		if (content && typeof(this.delegate.isContentLoaded) == 'function') {
			if(!this.delegate.isContentLoaded(this, content)) {
				if (typeof(this.delegate.loadContent) == 'function') {
					this.delegate.loadContent(this,content);
					return;
				}
			}
		}
		this.setLoadedContent(content);
	},
		
	setLoadedContent:function(content) {
 	
		if (typeof(this.delegate.willShow) == 'function') {
		 content = this.delegate.willShow(this, this.currentContent, content);
		}
		
		if (typeof(this.delegate.willClose) == 'function') {
			this.delegate.willClose(this, this.currentContent);
		}
		
		var shouldAnimate = true;
		if (typeof(this.delegate.shouldAnimateContentChange) == 'function') {
			shouldAnimate = this.delegate.shouldAnimateContentChange(this, this.currentContent, content);
		}
		
		if (shouldAnimate && typeof(this.delegate.willAnimate) == 'function') {
			//While animating we can assume we'll need both outgoing and
			//incoming content in the view at the same time, so just
			//append the incoming content prior to the animation
			
			//Note that in this case the content of the swapview should be
			//positioned absolutely so we can layer them on top of each other
			//if you can't accommodate that then just don't provide a
			//willanimate function in your delegate and you'll rely on the
			//immediate swapping
			this.didAnimate = true;
			if(this.currentContent !== content) this.view().appendChild(content);
			var animation = this.delegate.willAnimate(this, this.currentContent, content, this.didShow.bind(this, content));
		} else {
			
			this.didAnimate = false;
			//With no animation we don't assume both nodes are ever in the view at the same time
			//so remove the current content before appending the incoming content
			if(this.currentContent !== content) {
				if (this.currentContent && this.currentContent.parentNode) {
					this.currentContent.parentNode.removeChild(this.currentContent);
				}

				if(content) this.view().appendChild(content);
			}
			if(content) $(content).setOpacity(1.0);
			
			this.didShow(content);
		}
	},
	
	didShow: function(content) {
		
		//Pull the existing content out of the DOM, if it hasn't been already
		if (this.currentContent && (this.currentContent !== content) && this.currentContent.parentNode) {
			this.currentContent.parentNode.removeChild(this.currentContent);
		}
		
		if (typeof(this.delegate.didShow) == 'function') {
			this.delegate.didShow(this, this.currentContent, content);
		}
		
		this.currentContent = content;
	}
	
});


if (typeof(AC.ViewMaster) == 'undefined') { AC.ViewMaster = {}; }

//Really rough sketch implementation of what the thing linking the
//triggers, content, and swap view together would look like
AC.ViewMaster.Viewer = Class.create({

	view: null,
	triggerClassName: null,
	currentSection: null,
	requestedSection: null,
	sections: null,
	orderedSections: null,

	_locked: false,
	_didShowInitial: false,
	
	options: null,
	
	initialSectionFromId: function(initialId) {
		if(!initialId) return null;

		var initialSection = null;
		if (initialId && this.sections.get(initialId)) {
			initialSection = this.sections.get(initialId);
		}
	
		if(!initialSection) {
			var candidate, result = null;
			candidate = document.getElementById(initialId);
            if(candidate === this.view._view) candidate = null;
			if(!candidate) result = document.getElementsByName(initialId);
			if(result && result.length > 0) {
				candidate = result[0];
			}
			
            if(candidate === this.view._view) candidate = null;
			if(candidate) {
				
				if(candidate.tagName.toLowerCase() === "a") {
					if(Element.Methods.hasClassName(candidate,this.triggerClassName)) {
						initialSection = this.addSection(candidate)
					}
				}
				else  {
					initialSection = this.addSection(candidate)
				}
			}

		}
		return initialSection;
	},

	initialize: function(contents, view, triggerClassName, options) {
		this.triggerClassName = triggerClassName;
		this.sections = $H();
		this.orderedSections = [];
		
		this.options = options || {};
		
		
		var initialSection = null;
		if(contents) {
			for (var i = 0; i < contents.length; i++) {
				//contents could be a NodeList, so we're going to use that API
				//I added an item method to Array in apple_core
				section = this.addSection(contents.item(i))
			
				if (!initialSection) {
					initialSection = section;
				}
			}
		}
		//Moved down to workaround a bug: in Safari, the results of getElementsByClassName is a NodeList.
		//If we do new AC.SwapView(view) before looping on the NodeList, the NodeList get emptied....
		this.view = new AC.SwapView(view);
		this.view.setDelegate(this);
		
		var hashInitialId = document.location.hash.replace(/#/, ''), hashSection;
		if(hashInitialId !== this.view.view().id) {
            hashSection = this.initialSectionFromId(hashInitialId);
        }
		if(hashSection) initialSection = hashSection;
		
		if(!initialSection && typeof this.options.initialId === "string" && this.options.initialId.length > 0) {
			initialSection = this.initialSectionFromId(this.options.initialId);
		}

		//TODO do we want to show the initial section right away? seems like we have to but if no delegates are set yet this will be a bit different than subsequent calls to show
		this.show(initialSection);
		
		Event.observe(document, 'click', this._triggerClicked.bindAsEventListener(this));
		//In IE click event isn't sent when there is no text/image physically under the mouse, but the mouseup is, so we need to listen to that
		if(AC.Detector.isIEStrict()) {
			Event.observe(document, 'mouseup', this._triggerClicked.bindAsEventListener(this));
		}
	},
	
	setDelegate: function(delegate) {
		this.delegate = delegate;
		
		//repeat to let the delegate know where we're at:
		if (this.delegate && typeof(this.delegate.didShow) === 'function' && this.currentSection && this.currentSection.isContentLoaded()) {
			this.delegate.didShow(this, this.previousSection, this.currentSection);
		}
	},
	
	addSection: function(contentNode) {
		var section = new AC.ViewMaster.Section(contentNode,this);
		//add keyed entry into hash
		this.sections.set(section.id, section);
		//ass key into ordered array for prev/next functionality
		this.orderedSections.push(section.id);
 		return section;
	},
	
	triggerClicked: function(evt, element) {
		var section = null;	
		if (this.options.silentTriggers) {
			Event.stop(evt);
		}
	
		if (!!element.href.match(/#previous/)) {
			section = this.getPreviousSection();
		} else if (!!element.href.match(/#next/)) {
			section = this.getNextSection();
		} else {
			var matches = element.href.match(/#(.*)$/);
			if(matches) {
				var contentId = matches[1];
			}
			else {
				contentId = element.name;
			}
			section = this.sections.get(contentId);
		}
		
		//No section means either a lazy initialization of sections
		//or a section for which the content is remote.
		if(!section) {
			section = this.addSection(element);
		}
		
		if(section.isContentRemote() && !section.isContentLoaded()) {
			Event.stop(evt);
		}
		
		//stop if the trigger is trying to open the current section
		if (section == this.currentSection) {
			Event.stop(evt);
			return;
		} else if (!section) {
			return;
		}
		
		this._didShowInitial = true;
		this.show(section);
	},
		
	_triggerClicked: function(evt) {
		
		// Stop as early as possible if there's no need to continue
		if (this._locked) {
			Event.stop(evt);
			return;
		}
		
		var trigger = evt.element();
		
		if(AC.Detector.isIEStrict() && evt.type === "mouseup") {
			if(trigger && trigger.nodeName.toUpperCase() === 'A' ) {
				trigger = trigger.down("."+this.triggerClassName);
			}
		}
		else {
			while (trigger && trigger.nodeName.toUpperCase() != 'A' && trigger.nodeName.toUpperCase() != 'BODY') {
				trigger = trigger.parentNode;
			}
		}
		//ignore if the element is not a trigger
		if (trigger && trigger.href && Element.Methods.hasClassName(trigger,this.triggerClassName)) {
			this.triggerClicked(evt, trigger);
		} 
		
	},
	
	isContentLoaded: function(swapView, content) {
		//content her is a Section instance
		return content.isContentLoaded();
	},
	
	loadContent: function(swapView,content) {
		if(content) content.loadContent();
	},
	_showContentDidLoad: false,
	contentDidLoad: function(section,scriptFragment,context) {
        if(scriptFragment && scriptFragment.firstChild) this._showContentDidLoad = true;
		this.view.setLoadedContent(section);
		AC.loadRemoteContent.insertScriptFragment(scriptFragment);
        
        if (this._showContentDidLoad && this.delegate && typeof(this.delegate.didShow) == 'function') {
			this.delegate.didShow(this, this.previousSection, this.currentSection);
		}
        this._showContentDidLoad = false;
	},
	
	show: function(section) {

		if (this._locked || section == this.currentSection) {
			return;
		}
		
		this._locked = true;
		
		this.previousSection = this.currentSection;
		this.currentSection = section;
		
		this.view.setContent(section);
		
		if (typeof this.options.ensureInView === "boolean" && this.options.ensureInView) {
			if (this._didShowInitial) {
			
				var yOffset = section.content.viewportOffset()[1];
				//if the content is above viewport to pretty far down the page bring it into view
				if (yOffset < 0 || yOffset > (document.viewport.getHeight() * .75)) {
					new Effect.ScrollTo(section.content, {duration: 0.3});
				}
			} else {
				//ensure we're at the top of the page when the page has 
				//'loaded' otherwise a requested anchor is followed and the 
				//page may have started where the element was prior to styling
				$(document.body).scrollTo();
			}
		}
	},
	
	getNextSection: function() {
		var currentIndex = this.orderedSections.indexOf(this.currentSection.id);
		var nextIndex = (this.orderedSections.length - 1) == currentIndex ? 0 : currentIndex + 1 
		return this.sections.get(this.orderedSections[nextIndex])
	},
	
	getPreviousSection: function() {
		var currentIndex = this.orderedSections.indexOf(this.currentSection.id);
		var previousIndex = 0 == currentIndex ? this.orderedSections.length - 1 : currentIndex - 1 
		return this.sections.get(this.orderedSections[previousIndex])
	},
	
	willShow: function(view, outgoing, incoming) {
		//swap view only deals with nodes once we give it the node to show 
		//so we need to keep track of which section was requested if we ever
		//need to know about the incoming section and not the incoming node
		//this.requestedSection = incoming;
		
		if (this.delegate && typeof(this.delegate.willShow) == 'function') {
			this.delegate.willShow(this, this.previousSection, this.currentSection);
		}
		
		this._repaintTriggers(this.previousSection, this.currentSection);
		
		if (this._didShowInitial && incoming && incoming != this.previousSection) {
			$(incoming.content).setOpacity(0.0);
			$(incoming.content).removeClassName('hidden')
		}
		
		if(incoming) {
			return incoming.willShow(this);
		}
		return null;
	},
	
	willClose: function(view, outgoing) {
	
		if (this.delegate && typeof(this.delegate.willClose) == 'function') {
			this.delegate.willClose(this, this.currentSection);
		}

		if (this.currentSection) {
			this.currentSection.willClose(this);
		}
	},
	
	shouldAnimateContentChange: function(swapView, swapViewCurrentContent, swapViewNextContent) {
		return (typeof this.options.shouldAnimateContentChange === "boolean") ? this.options.shouldAnimateContentChange : true;
	},
	
	willAnimate: function(view, outgoing, incoming, afterFinish) {
		var duration = this.options.animationDuration || 0.4;
		var queueScope = Math.random() + 'Queue'; //TODO probalby need a unique id for this component we use for queue names
		
		//if the user hasn't interacted with this yet, jsut continue on
		if (!this._didShowInitial && typeof(afterFinish) == 'function') {
			afterFinish();
			return;
		}
		
		if (outgoing) {
			return new Effect.Parallel([
				new Effect.Opacity(outgoing, {sync: true, from: 1.0, to: 0.0}),
				new Effect.Opacity(incoming, {sync: true, from: 0.0, to: 1.0})], {
					duration: duration,
					afterFinish: afterFinish,
					queue: {scope: queueScope}
					});
		} else {
			return new Effect.Opacity(incoming, {
				from: 0.0, 
				to: 1.0, 
				duration: duration,
				afterFinish: afterFinish,
				queue: {scope: queueScope}});
		}
	},
	
	didShow: function(view, outgoing, incoming) {
		if (this.currentSection) {
			this.currentSection.didShow(this);
		}
		
		this._didShowInitial = true;
		this._locked = false;
		
		// want to only alert our delegate that we're done after unlocked
		if (!this._showContentDidLoad && this.delegate && typeof(this.delegate.didShow) == 'function') {
			this.delegate.didShow(this, this.previousSection, this.currentSection);
		}
	},
	
	_repaintTriggers: function(outgoing, incoming) {
		if(outgoing) {
			var outgoingTriggers = outgoing.triggers();
			for(var i=0, iTrigger;(iTrigger = outgoingTriggers[i]);i++) {
				iTrigger.removeClassName('active');
			}
			outgoingTriggers = outgoing.relatedElements();
			for(var i=0, iTrigger;(iTrigger = outgoingTriggers[i]);i++) {
				iTrigger.removeClassName('active');
			}
			
		}
		
		if(incoming) {
			var incomingTriggers = incoming.triggers();
			for(var i=0, iTrigger;(iTrigger = incomingTriggers[i]);i++) {
				iTrigger.addClassName('active');
			}
			incomingTriggers = incoming.relatedElements();
			for(var i=0, iTrigger;(iTrigger = incomingTriggers[i]);i++) {
				iTrigger.addClassName('active');
			}
		}
	}
	
});

AC.ViewMaster.Section = Class.create({

	content: null,
	
	moviePanel: null,
	controllerPanel: null,
	movie: null,
	_movieController: null,
	movieLink: null,
	endState: null,
	
	hasShown: false,
	_isContentRemote: false,
	isContentRemote: function() {
		return this._isContentRemote;
	},
	_isContentLoaded: true,
	isContentLoaded: function() {
		return this._isContentLoaded;
	},

	_onMoviePlayable: Prototype.EmptyFunction,
	_onMovieFinished: Prototype.EmptyFunction,
	
	id: null,
	
	triggers: function() {
		if(!this._triggers) {
			this._triggers = [];
			var triggers = document.getElementsByClassName(this.viewMaster.triggerClassName);
			for(var i=0, iTrigger;(iTrigger = $(triggers[i]));i++) {
				if(iTrigger.tagName.toLowerCase() !== "a") continue;
				if (iTrigger.href.match('#' + this.id + '$')) {
					this._triggers.push(iTrigger);
				}
			}
		}
		return this._triggers;
	},
	
	relatedElements: function() {
		if(!this._relatedElements) {
			this._relatedElements = document.getElementsByClassName(this.id);
			//this._dependentElements = [];
			//var triggers = document.getElementsByClassName(this.id);
			//for(var i=0, iTrigger;(iTrigger = $(triggers[i]));i++) {
			//	this._dependentElements.push(iTrigger);
			//}
		}
		return this._relatedElements;
	},

	initialize: function(content, viewMaster) {
		
		this.content = $(content);
		
		//Special casing for remote content / lazy initialization
		if(this.content.tagName.toLowerCase() === "a") {
			var href = this.content.href;
			var parts = href.split("#");
			this._contentURL = parts[0];
			var windowLocationParts = window.location.href.split("#");
			
			if(parts.length === 2) {
				this.id = parts[1];
			}
			
			if(this._contentURL.length > 0 && (this._contentURL !== windowLocationParts[0]) && (!this._contentURL.startsWith("#") || this._contentURL !== href)) {				
				//We should assess wether the link is an external html, an image or a movie.
				//For now I'm going to assume an external HTML, but we'll have to revisit that.
				this._isContentRemote = true;
				this._isContentLoaded = false;
			}
			//This is an inner document reference:
			else {
				var loadedContent = $(this.id);
				if(loadedContent) this.content = loadedContent;
			}
			
			
			if(!this.id) this.id = this.content.name;

		
		}
		else {
			this.id = content.id;
		}
		//disguise the contentAnchor so trigger links don't jump to it
		//of course trigger links need to know their target is now prefixed 
		//with "MASKED-"
		if(!this._isContentRemote || this._isContentLoaded) {
			this.content.setAttribute('id', 'MASKED-' + this.id);
		}
		
		//set up the viewMaster
		if(viewMaster) this.viewMaster = viewMaster;
		
		//use found node if it has content class
		if (!this._isContentRemote && this._isContentLoaded && !this.content.hasClassName('content')) {
			//otherwise search the node for the first child flagged as content
			var contentChild = this.content.getElementsByClassName('content')[0];
			if(contentChild) this.content = contentChild;
		}
		
		this.isMobile = AC.Detector.isMobile();
	},
	
	remoteContentDidLoad: function(remoteContentNode,scriptFragment) {
		//update the href to be #id
		this.content.href = "#"+this.id;
		
		//Set the content to be the remote one
		//Remove the id/name that was on the link:
		this.content.removeAttribute("id");
		this.content.removeAttribute("name");
		
		this.content = $(remoteContentNode);

		//this.content.id = this.id;
		this.content.setAttribute('id', 'MASKED-' + this.id);
		this._isContentLoaded = true;
		this.viewMaster.contentDidLoad(this,scriptFragment);
	},

	loadContent: function() {
		if(this._isContentLoaded) {
			var self = this;
			self.viewMaster.contentDidLoad(self,null);
			//setTimeout(function(){self.viewMaster.contentDidLoad(self);},0);
		}
		else {
			AC.loadRemoteContent(this._contentURL,true,true,this.remoteContentDidLoad.bind(this));
		}
	},
	
	willShow: function() {
		
		if (!this.hasShown) {
			this.hasShown = true;
			var images = this.content.getElementsByClassName('imageLink');
			for (var i = 0; i < images.length; i++) {
				this._loadImage(images[i]);
			}
		
			if (!this.moviePanel) {
				this.movieLink = this.content.getElementsByClassName('movieLink')[0];
				this.posterLink = this.content.getElementsByClassName('posterLink')[0];

				if (this.movieLink) {
					this._loadMovie();
				}
			}
		}
		
		return this.content;
	},
	
	_loadImage: function(imageLink) {
		var image = document.createElement('img');
		image.setAttribute('src', imageLink.href);
		image.setAttribute('alt', imageLink.title);
		
		imageLink.parentNode.replaceChild(image, imageLink);
	},
	
	_loadMovie: function() {
		this.moviePanel = $(document.createElement('div'));
		this.moviePanel.addClassName("moviePanel");
		
		this.movieLink.parentNode.replaceChild(this.moviePanel, this.movieLink);
		
		this.controllerPanel = $(document.createElement('div'));
		this.controllerPanel.addClassName('controllerPanel');
		this.moviePanel.parentNode.insertBefore(this.controllerPanel, this.moviePanel.nextSibling);
		
		this.endState = $(this.content.getElementsByClassName('endState')[0]);
		if (this.endState) {
			this.endState.parentNode.removeChild(this.endState);
			
			var replay = $(this.endState.getElementsByClassName('replay')[0])
			replay.observe('click', function(evt) {
				Event.stop(evt);
				this.replayMovie();
			}.bindAsEventListener(this))
			
		}
	},
	
	didShow: function(viewer) {
		
		var needsController = this.hasMovie() && !this.isMobile;
		
		if (needsController) {
			this._movieController = new AC.QuicktimeController();
			this.controllerPanel.innerHTML = '';
			this.controllerPanel.appendChild(this._movieController.render());
		}
		
		this._playMovie();
		
		if (needsController) {
			this._onMoviePlayable = this._movieController.monitorMovie.bind(this._movieController);
			this._onMovieFinished = this.didFinishMovie.bind(this);
			
			this._movieController.attachToMovie(this.movie, {
				onMoviePlayable: this._onMoviePlayable,
				onMovieFinished: this._onMovieFinished});
		}
	},
	
	willClose: function(viewer) {
		this._closeController();
		this._closeMovie();
	},
	
	_closeMovie: function() {
		if (this.movie && this.moviePanel) {
			this.moviePanel.removeChild(this.movie)
			this.movie = null;
			this.moviePanel.innerHTML = '';
		}
	},
	
	_closeController: function(){
		if (this._movieController && this._movieController.movie && this.hasMovie() && !this.isMobile) {
			//TODO this prevents the audio from lingering in safari for the most part, but is probably jsut masking a problem somewhere
			this._movieController.Stop();
			this._movieController.detachFromMovie();
			//TODO set the controller as inactive for styling purposes?
		}
	},
	
	hasMovie: function() {
		return !!this.movieLink;
	},
	
	didFinishMovie: function() {
		if (!this.hasMovie()) {
			return;
		}
		
		this._closeController();
		this._closeMovie();
			
		if (this.endState) {
			this.moviePanel.appendChild(this.endState);
		}
	},
	
	_playMovie: function() {
		if (this.movieLink && this.moviePanel) {
			
			this.moviePanel.innerHTML = '';
			
			if (this.posterLink && this.posterLink.href) {
				var posterFrame = this.posterLink.href;
			}
			
			var movieParams = this.movieLink.href.toQueryParams();
			
			var width = movieParams.width || 640;
			var height = movieParams.height || 480;
			var color = movieParams.bgcolor || 'white';
			
			//need some unique id for these guys
			this.movie = AC.Quicktime.packageMovie(this.movieLink.id + "movieId", this.movieLink.href, {
				width: width,
				height: height,
				controller: false,
				posterFrame: posterFrame,
				showlogo: false,
				autostart: true,
				cache: true,
				bgcolor: color,
				aggressiveCleanup: false});
			
			this.moviePanel.appendChild(this.movie);
		}
	},
	
	replayMovie: function() {
		this._playMovie();
		this._movieController.attachToMovie(this.movie, {
			onMoviePlayable: this._onMoviePlayable,
			onMovieFinished: this._onMovieFinished});
	}
	
});

AC.ViewMaster.Slideshow = Class.create()
Object.extend(AC.ViewMaster.Slideshow.prototype, Event.Listener);
Object.extend(AC.ViewMaster.Slideshow.prototype, {

	viewMaster: null,
	animationTimeout: null,
	options: null,

	_playing: false,
	_active: false,
	
	_progress: 0,
    setProgress: function(value) {
        this._progress = value;
    },
    progress: function() {
        return this._progress;
    },

	initialize: function(viewMaster, triggerClassName, options) {
		this.viewMaster = viewMaster;
		this.viewMaster.setDelegate(this);
		
		this.triggerClassName = triggerClassName;
		
		this.options = options || {};
		
		this.start();
		
		Event.observe(document, 'click', this._triggerHandler.bindAsEventListener(this));
	},
	
	start: function() {
		if (this._active) {
			return;
		}
		
		this._active = true;
		if (this.options.wipeProgress == "always" || this.options.wipeProgress == "on start") {
			this._progress = 0;
		}
		this.play(true);
		this._repaintTriggers();
	},
	
	stop: function() {
		if (!this._active) {
			return
		}
		
		this._active = false;
		this.pause();
		this._repaintTriggers();
	},
	
	play: function(wasStart) {
		if (!this._active) {
			return;
		}
		
		if (this.options.wipeProgress == "always" || (this.options.wipeProgress == "on play" && !wasStart)) {
			this._progress = 0;
		}
		
		this.animationTimeout = setTimeout(this._update.bind(this), this._heartbeatDelay());
		this._playing = true;
	},
	
	_update: function() {
		
		if (typeof(this.options.onProgress) == 'function') {
			this.options.onProgress(this._progress, this.delay());
		}
		
		if (this._progress >= this.delay()) {
			this._progress = 0;
			this.next();
		} else {
			this._progress += this._heartbeatDelay();
			this.animationTimeout = setTimeout(this._update.bind(this), this._heartbeatDelay());
		}
	},
	
	delay: function() {
 		return this.options.delay || 5000;
	},
	
	_heartbeatDelay: function() {
		return this.options.heartbeatDelay || 100;
	},
	
	pause: function() {
		clearTimeout(this.animationTimeout);
		this._playing = false;
	},
	
	next: function() {
		this.viewMaster.show(this.viewMaster.getNextSection());
	},
	
	previous: function() {
		this.viewMaster.show(this.viewMaster.getPreviousSection());
	},
	
	willShow: function(viewMaster, outgoing, incoming) {
		this.pause();
	},
	
	didShow: function(viewMaster, outgoing, incoming) {
		this.play();
	},
	
	_triggerHandler: function(evt) {
		
		var element = evt.element();
		var section = null;
		
		//ignore if the element is not a trigger
		if (element.hasClassName(this.triggerClassName) && element.href.match(/#slideshow-toggle/)) {
			Event.stop(evt);
			
			if (this._active) {
				this.stop();
			} else {
				this.start();
			}
		}
	},
	
	_repaintTriggers: function() {
		
		var triggers = document.getElementsByClassName(this.triggerClassName);
		for (var i = triggers.length - 1; i >= 0; i--){
			this._repaintTrigger(triggers[i])
		}
	},
	
	_repaintTrigger: function(trigger) {
		var trig = $(trigger);
		if (this._active) {
			trig.addClassName('playing');
		} else {
			trig.removeClassName('playing');
		}
	}
	
});


AC.loadRemoteContent = function(contentURL,importScripts,importCSS,callback,context,delegate) {
	if(typeof contentURL !== "string") return;
	if(typeof importScripts !== "boolean") importScripts = true;
	if(typeof importCSS !== "boolean") importCSS = true;
	var callee = arguments.callee;
	var registeredArguments = callee._loadArgumentsByUrl[contentURL];
	if(!registeredArguments) {
		callee._loadArgumentsByUrl[contentURL] = {
			contentURL:contentURL,
			importScripts:importScripts,
			importCSS:importCSS,
			callback:callback,
			context:context,
			delegate:delegate
			};
		
		new Ajax.Request(contentURL, {
		  method:'get',
		  requestHeaders: {Accept: 'text/xml'},
		  onSuccess: arguments.callee.loadTemplateHTMLFromRequest,
		  onFailure: arguments.callee.failedToadTemplateHTMLFromRequest,
		  onCreate: function(response) {
			response.request.overrideMimeType('text/xml');
		  }
		  
		});
		
	}
}

AC.loadRemoteContent._loadArgumentsByUrl = {};

AC.loadRemoteContent.loadTemplateHTMLFromRequest = function(httpResponse) {
	var reqURL = httpResponse.request.url;
	var callee = arguments.callee;
	var registeredArguments = AC.loadRemoteContent._loadArgumentsByUrl[reqURL];

	var windowDocument = window.document;
	var xmlDocument = httpResponse.responseXMLValue().documentElement;

	if(AC.Detector.isIEStrict()) {
		xmlDocument = xmlDocument.ownerDocument;
	}

	var windowDocument = window.document;
	var scriptFragment = document.createDocumentFragment();

	if(registeredArguments.importScripts) {
		AC.loadRemoteContent.importScriptsFromXMLDocument(xmlDocument,scriptFragment,registeredArguments);
	}
	if(registeredArguments.importCSS) {
		AC.loadRemoteContent.importCssFromXMLDocumentAtLocation(xmlDocument,reqURL,registeredArguments);
	}

	//var result = xmlDocument.getElementsByTagName("body")[0].clonedInnerDocumentFragment();
	//Apparently, importing a document fragment doesn't cut it. However, importing nodes and adding them to a document fragment does!
	var result = null;
	var rootElement = null;
	var body = xmlDocument.getElementsByTagName("body")[0];
	
	if(!body) {
		return;
	}
	
	body.normalize();
	var rootElement = Element.Methods.childNodeWithNodeTypeAtIndex(body, Node.ELEMENT_NODE,0);
	
    var isSafari2 = AC.Detector.isSafari2();
	if(rootElement) {
        if(isSafari2) {
            result = windowDocument._importNode(rootElement, true);
        }
        else {
            result = windowDocument.importNode(rootElement, true);
        }
		//We can live without that for now
		if(result.cleanSpaces) result.cleanSpaces(true);
	}
	else {
		if(body.cleanSpaces) body.cleanSpaces(true);
		else if(typeof body.normalize === "function") body.normalize();

		var bodyChildNodes = body.childNodes;
		result = windowDocument.createDocumentFragment();
		var notSpace = /\S/;
		for(var i=0,iBodyChildNode=0;(iBodyChildNode = bodyChildNodes[i]);i++) {
			var importedNode = (isSafari2) ? windowDocument._importNode(iBodyChildNode, true) : windowDocument.importNode(iBodyChildNode, true);
			result.appendChild(importedNode);
		}
	}
	
	//invoke the callback with result:
	var callback = registeredArguments.callback;
	callback(result,scriptFragment,registeredArguments.context);

		//console.timeEnd("loadTemplateHTMLFromXMLDocument");

}
AC.loadRemoteContent.javascriptTypeValueRegExp = new RegExp("text/javascript","i");
AC.loadRemoteContent.javascriptLanguageValueRegExp = new RegExp("javascript","i");

AC.loadRemoteContent.documentScriptsBySrc = function() {
	if(!AC.loadRemoteContent._documentScriptsBySrc) {
		AC.loadRemoteContent._documentScriptsBySrc = {};
		var scripts = document.getElementsByTagName('script');
		if(!scripts || scripts.length === 0) {
			return AC.loadRemoteContent._documentScriptsBySrc;
		}
		
		for(var i=0,iScript=null;(iScript = scripts[i]);i++) {
			var type = iScript.getAttribute("type");
			var src = null;

			var language = iScript.getAttribute("language");
			if(!this.javascriptTypeValueRegExp.test(type) && !this.javascriptLanguageValueRegExp.test(language)) continue;

			if(iScript.hasAttribute) {
				var iScriptHasSrc = iScript.hasAttribute("src");
			}
			else {
				var iScriptHasSrc = Element.Methods.hasAttribute(iScript,"src");
			}

			if(iScriptHasSrc) {
				var src = iScript.getAttribute("src");
				AC.loadRemoteContent._documentScriptsBySrc[src] = src;
			}

		}
	}
	return AC.loadRemoteContent._documentScriptsBySrc;
}

AC.loadRemoteContent.importScriptsFromXMLDocument = function(xmlDocument,frag,registeredArguments) {
		var scripts = xmlDocument.getElementsByTagName('script'),
			type,
			src,
			language,
			iScriptHasSrc,
            contentURL = registeredArguments.contentURL,
            delegate = registeredArguments.delegate,
            context = registeredArguments.context,
            hasShouldImportScript = (delegate && typeof delegate.shouldImportScript === "function"),
            shouldImportScript = true;
		if(!frag) frag = document.createDocumentFragment();
		var documentScriptsBySrc = AC.loadRemoteContent.documentScriptsBySrc();
		for(var i=0,iScript=null;(iScript = scripts[i]);i++) {
			type = iScript.getAttribute("type");
			src = null;
            shouldImportScript = true;
            

			language = iScript.getAttribute("language");
			if(!this.javascriptTypeValueRegExp.test(type) && !this.javascriptLanguageValueRegExp.test(language)) continue;

			if(iScript.hasAttribute) {
				iScriptHasSrc = iScript.hasAttribute("src");
				src = iScript.getAttribute("src");
			}
			else {
				src = iScript.getAttribute("src");
				iScriptHasSrc = ((src != null) && (src !== ""));
			}

			//var localScript = window.document.importNode(iScript, true);
			//frag.appendChild(localScript);
            if(iScript.getAttribute("id") === "Redirect" ||  (hasShouldImportScript && !delegate.shouldImportScriptForContentURL(iScript,contentURL,context))) {
                    continue
            }
            
			if(iScriptHasSrc) {
				if( !documentScriptsBySrc.hasOwnProperty(src)) {
				
					//var localScript = window.document.importNode(iScript, true);
					var localScript = document.createElement('script');
					localScript.setAttribute("type","text/javascript");
					localScript.src = src;
					AC.loadRemoteContent._documentScriptsBySrc[src] = src;
					frag.appendChild(localScript);
				}
			}
			//Inline string
			else {
				
				var localScript = document.createElement('script');
				localScript.setAttribute("type","text/javascript");
				if(AC.Detector.isIEStrict()) {
					//This twisted construction is to work around a bug where IE immediately execute
					//a script whith it's text property initialized, so an "inline" script, when appended to
					//a document fragment.
					var contentFunction = new Function(iScript.text);
					localScript.onreadystatechange = function() {
							var target = window.event.srcElement;
							if ( !target.isLoaded && ((target.readyState == 'complete') || (target.readyState == 'loaded'))) {
								target.onreadystatechange = null;
								target.isLoaded = true;
								contentFunction();
				}
			}
				}
				else {
                   var ua = navigator.userAgent.toLowerCase(); 
                   var isAppleWebKit = (ua.indexOf('applewebkit') != -1);
                   var version = parseInt(parseFloat( ua.substring( ua.lastIndexOf('safari/') + 7 ) ));
                   var isSafari2x = (isAppleWebKit && version >= 419);

                    if(isSafari2x) {
                        localScript.innerHTML = iScript.innerHTML;
                    }
                    else {
                        localScript.text = iScript.text;
                    }
				}
				AC.loadRemoteContent._documentScriptsBySrc[src] = src;
				frag.appendChild(localScript);

		}

		}
		return frag;
};

AC.loadRemoteContent.insertScriptFragment = function(scriptFragment) {
	if(!scriptFragment) return;
	var head = document.getElementsByTagName("head")[0];
	head.appendChild(scriptFragment);
	head=null;
}

AC.loadRemoteContent.documentLinksByHref = function() {
	if(!AC.loadRemoteContent._documentLinksByHref) {
		AC.loadRemoteContent._documentLinksByHref = {};
		var links = document.getElementsByTagName('link');
		if(!links || links.length === 0) {
			return AC.loadRemoteContent._documentLinksByHref;
		}
		
		for(var i=0,iLink=null;(iLink = links[i]);i++) {
			var type = iLink.getAttribute("type");
			if(iLink.type.toLowerCase() !== "text/css") {
				continue;
			}
			var src = null;

			if(iLink.hasAttribute) {
				var iLinkHasSrc = iLink.hasAttribute("href");
			}
			else {
				var iLinkHasSrc = Element.hasAttribute(iLink,"href");
			}

			if(iLinkHasSrc) {
				var src = iLink.getAttribute("href");
				AC.loadRemoteContent._documentLinksByHref[src] = src;
			}

		}
	}
	return AC.loadRemoteContent._documentLinksByHref;
}

AC.loadRemoteContent.__importCssElementInHeadFromLocation = function(iNode,head,url) {
    //I'm going to prepend the component's url
	var isLink = (iNode.tagName.toUpperCase() === "LINK");
    if(isLink) {
		var type = iNode.getAttribute("type");
		if(!type || type && type.toLowerCase() !== "text/css") {
			return;
		}
        var href = iNode.getAttribute("href");
        if(!href.startsWith("http") && !href.startsWith("/")) {
            var hrefOriginal = href;
			if(url.pathExtension().length > 0) {
				url = url.stringByDeletingLastPathComponent();
			}
            href = url.stringByAppendingPathComponent(hrefOriginal);
        }
		if(AC.Detector.isIEStrict()) {
			var stylesheet = window.document.createStyleSheet(href,1);
		}
		else 
		{
			var importedNode = window.document.importNode(iNode, true);
            importedNode.href = href;
		}
		AC.loadRemoteContent.documentLinksByHref()[href] = href;
    }
	if(!AC.Detector.isIEStrict() || (AC.Detector.isIEStrict() && !isLink)) {
		head.insertBefore(importedNode,head.firstChild);
	}
};

AC.loadRemoteContent.importCssFromXMLDocumentAtLocation = function(xmlDocument,url,registeredArguments) {
	//CSS can be linked using either a <style> tag or a <link> tag. I'm going to import them, and only looking at the head child nodes.
	var head = window.document.getElementsByTagName("head")[0];	
	var candidateNodes = [];
	candidateNodes.addObjectsFromArray(xmlDocument.getElementsByTagName("style"));
	candidateNodes.addObjectsFromArray(xmlDocument.getElementsByTagName("link"));
	if(candidateNodes) {
		var documentLinksByHref = AC.loadRemoteContent.documentLinksByHref();
		for(var i=0,iNode=null;(iNode = candidateNodes[i]);i++) {
			var href = iNode.getAttribute("href");
			if(documentLinksByHref.hasOwnProperty(href)) {
				continue;
			}
			this.__importCssElementInHeadFromLocation(iNode,head,url);
		}
	}

};

Ajax.Request.prototype._overrideMimeType = null;
Ajax.Request.prototype.overrideMimeType = function(overrideMimeTypeValue) {
	this._overrideMimeType = overrideMimeTypeValue;
	if (this.transport.overrideMimeType) {
		this.transport.overrideMimeType(overrideMimeTypeValue);
	}
};

Ajax.Request.prototype._doesOverrideXMLMimeType = function() {
	return (this._overrideMimeType === "text/xml");
};

Ajax.Response.prototype.responseXMLValue = function() {
	if(AC.Detector.isIEStrict()) {
		var xmlDocument = this.transport.responseXML.documentElement;
		if(!xmlDocument && this.request._doesOverrideXMLMimeType()) {
			this.transport.responseXML.loadXML(this.transport.responseText);
		}
	}
	return this.transport.responseXML;
};
