// contents: inheritance.js, nav.js, menu.js, navSimpleObject
var ClassBackup=Class;
(function(){var a=!1,b=/xyz/.test(function(){xyz})?/\b_super\b/:/.*/;this.Class=function(){};Class.extend=function(c){function d(){!a&&this.init&&this.init.apply(this,arguments)}var f=this.prototype,e,g;a=!0;g=new this;a=!1;for(e in c)g[e]="function"==typeof c[e]&&"function"==typeof f[e]&&b.test(c[e])?function(a,b){return function(){var c=this._super,d;this._super=f[a];d=b.apply(this,arguments);this._super=c;return d}}(e,c[e]):c[e];d.prototype=g;d.constructor=d;d.extend=arguments.callee;return d}})();
(function(a){window.navObject=Class.extend({animateTransitions:history.pushState,contentReference:".innercontent",isAnimating:!1,isInitialized:!1,isInitialLoad:!0,usePushState:history.pushState,initialize:function(){this.isInitialized||(this.initializeAjax(),menu.initializeNav(),this.initializePage(),menu.selectMenuItemByPage())},initializeAjax:function(){this.isSlowBrowser=-1<navigator.userAgent.indexOf("MSIE")||-1<navigator.userAgent.indexOf("Mobile");this.showLoadingState();this.isInitialized=
!0;this.usePushState?a(window).bind("popstate",a.proxy(this.pagechange,this)):(a(window).hashchange(a.proxy(this.hashchange,this)),this.hashchange())},initializePage:function(){a(".navLink").click(a.proxy(this.onCustomLinkClicked,this));grid||this.resizeSections()},showError:function(b,c){c=c&&"error"!=c?c.replace(/\\n/g,"<br/>"):a(".errorGenericMessage").html();this.popup(480,"Error",c,"OK");this.animateContentIn()},hideError:function(){this.errorDiv&&this.errorDiv.dialog("close")},showLoadingState:function(){var b,
c,d;this.hideLoadingState();this.isSlowBrowser&&a("<div>").addClass("loadingBlocker").height(a(document).height()).appendTo("body");b=a(".loadingMessage");c=a(".innercontent > div");c=Math.round(c.offset().left+c.width()/2-b.width()/2);d=a(window).height()>a("body").height()?a("body").height():a(window).height();d=Math.round((d-b.height())/2);b.css({left:c,top:d}).show()},hideLoadingState:function(){a(".loadingMessage").hide();a(".loadingBlocker").remove()},animateContentOut:function(){this.animateTransitions&&
a(this.contentReference).css({opacity:0.25})},animateContentIn:function(){this.animateTransitions?a(this.contentReference).animate({opacity:1},500,a.proxy(function(){grid||this.hideLoadingState();this.isAnimating=!1},this)):this.hideLoadingState()},resizeSections:function(){var b=a(this.contentReference+" > div");a(".sidebar").animate({height:b.height()+parseInt(b.css("padding-bottom").replace("px",""))+parseInt(b.css("padding-top").replace("px",""))-28},200);grid&&grid.settings.fullWidth&&(this.resizeGrid(),
a(window).resize(this.resizeGrid));grid||this.hideLoadingState()},resizeGrid:function(){var b;b=a(".content").width()-(a(".sidebar").width()+33);grid.setWidth(b)},getPage:function(a){a||(a=!this.usePushState&&location.hash.replace("#","")?location.hash.replace("#",""):window.location.pathname);return a},pagechange:function(){this.isInitialLoad||this.changePage(window.location.pathname);this.isInitialLoad=!1},hashchange:function(){this.changePage(location.hash.replace("#",""));this.isInitialLoad=!1},
changePageURL:function(a){this.usePushState?(history.pushState({},"",a),this.changePage(a)):location.hash=a},changePage:function(b){window.scrollTo(0,0);this.animateTransitions&&(this.isAnimating=!0);this.hideError();this.showLoadingState();b&&-1==b.indexOf("overview.action")&&menu.selectMenuItemByPage(b);this.animateContentOut();grid&&(grid.destroy(),grid=!1,a(window).unbind("resize"));a.get(b,a.proxy(this.onPageLoaded,this)).error(a.proxy(this.showError,this))},onPageLoaded:function(b,c){a(".sidebar").show();
var d=a("<div>").html(b);a(this.contentReference).replaceWith(d.find(this.contentReference));this.animateContentOut();document.title=b.substring(b.indexOf("<title>")+7,b.indexOf("</title>"));this.waitForAdditionalData||this.animateContentIn();if("error"==c||!b)return this.showError();this.initializePage()},onCustomLinkClicked:function(b){this.changePageURL("SPAN"==b.target.tagName?a(b.target).parent().attr("href"):a(b.target).attr("href"));return!1},popup:function(){}})})(jQuery);
(function(a){window.menuObject=Class.extend({initializeNav:function(){a(".topbar .topbar-select").click(a.proxy(this.toggleSelectAccount,this));a(".sidebar .sidebar-select").click(a.proxy(this.toggleSelectNav,this));a(".sidebar .select-dropdown li a").click(a.proxy(this.changeSelectNav,this));a(".sidebar > ul > li").click(a.proxy(this.setupPrimaryNav,this));a(".sidebar ul ul li").click(a.proxy(this.setupSubNav,this));a("body").mouseup(a.proxy(this.mouseReleased,this));a(".button, .toolbar-button").mousedown(function(){a(this).addClass("click")})},
mouseReleased:function(b){a(".button, .toolbar-button").removeClass("click");0==a(b.target).closest(".portal-select.active").length&&("sidebar-select"==a(".portal-select.active").attr("id")?this.toggleSelectNav():"topbar-select"==a(".portal-select.active").attr("id")&&this.toggleSelectAccount())},setupPrimaryNav:function(b){var c,d=!0,b="LI"==b.target.tagName?a(b.target):a(b.target).closest("li");c=b.find("ul :first a");0==c.length&&(c=b.find("a"),d=!1);d?(b.toggleClass("selected").find("ul").slideToggle(200),
b.hasClass("selected")&&c.attr("href")&&1<c.attr("href").length&&!nav.isAnimating&&nav.changePageURL(c.attr("href"))):c.attr("href")&&1<c.attr("href").length&&!nav.isAnimating&&(b.parent().find("li").removeClass("selected").find("ul").slideUp(200),b.toggleClass("selected").find("ul").slideToggle(200),nav.changePageURL(c.attr("href")));return!1},setupSubNav:function(b){b="A"==b.target.tagName?a(b.target):a(b.target).closest("li").find("a");b.attr("href")&&1<b.attr("href").length&&!nav.isAnimating&&
nav.changePageURL(b.attr("href"));return!1},toggleSelectNav:function(){a(".sidebar .select-dropdown").slideToggle(100);a(".sidebar .sidebar-select").toggleClass("active");return!1},changeSelectNav:function(b){var b="A"==b.target.tagName?a(b.target):a(b.target).closest("a"),c=b.attr("href");"-nav"==c.substring(c.length-4)?(this.selectNavItem(b),visible=a("ul.nav:visible"),0<visible.length?visible.slideUp(200,a.proxy(function(){a("#"+c).slideDown(200);nav.changePageURL(a("#"+c).find("ul a:first").attr("href"))},
this)):(a("#"+c).slideDown(200),nav.changePageURL(a("#"+c).find("ul a:first").attr("href")))):nav.changePageURL(b.attr("href"));return!1},selectNavItem:function(b){a(".sidebar .section-title").html(b.find("span").html());a(".sidebar .section-icon").removeClass().addClass("section-icon "+b.attr("href"));a(".sidebar .select-dropdown li").removeClass("current");b.parent().addClass("current")},toggleSelectAccount:function(){a(".topbar .tooltip").toggle();a(".topbar .topbar-select").toggleClass("active");
return!1},selectMenuItem:function(b){var c=b.closest("ul.nav").show();a(".sidebar ul.nav:not(#"+c.attr("id")+")").hide();this.selectNavItem(a(".sidebar .select-dropdown a[href="+c.attr("id")+"]"));a(".sidebar ul ul li").removeClass("selected");b.parent().addClass("selected").closest(".item").addClass("selected").find("ul").slideDown(200)},selectMenuItemByPage:function(b){b=a('.sidebar a[href="'+nav.getPage(b)+'"]');0<b.length&&this.selectMenuItem(b)},generateSidebar:function(b){a(b).each(function(){var b=
a(".sidebar .select-dropdown").after(a('<ul class="nav" id="'+this.id+'">')).next("ul").prepend('<div class="horizontal-divider">');a(this.links).each(function(){var d=a('<li class="item">').html('<a><div class="item-icon"></div><div class="title">'+this.title+'</div><div class="item-arrow"></div></a>');this.title||d.hide();b.append(d);var f=d.append('<ul style="display: none;">').find("ul");a(this.links).each(function(){f.append(a('<li class="subitem">').html('<a href="'+this.link+'"><div class="subitem-icon"></div><div class="title">'+
this.title+"</div></a>"))})})})}})})(jQuery);
window.navSimpleObject = navObject.extend({ initializeAjax: function() { }, changePageURL: function(url) { location.href = url; } }); window.grid = null;
Class=ClassBackup;