// note: this object is just a cleanup of the previously written functionality, preserving the same logic
// note: within this closure, "$" is a reference to jQuery (not Prototype)
(function($) {
    window.purchaseFormObject = {
        purchaseTotal: 0,

        init: function() {
            // if there are non-blank fields, validate by default (result: when errors are displayed, the defaults can be rendered while preserving the Continue button functionality)
            $('#purchase-program :input[value!=""]').addClass('validation-passed');
            this.initializeCartSection();

            // add onclick events
            $('#continue').click(this.clickContinue);
            $('#purchase-items-edit').click(this.clickEditItems);
            $('#credit-card-edit').click(this.clickEditCC);
            $('#billing-information-edit').click(this.clickEditBilling);
            $('#cancel-placeorder').click(this.clickCancel);
            $('input.program-choice').change(this.changeCart);
            $('#purchase-program :input').bind('keyup change', this.validateForm);
        },
       validateState : function(event){
    	   
    	   $('#advice-validate-state').remove();
    	   
    	   var currentValue = $("#select-state").val();
    	   
    	   if(currentValue == -1 && jQuery("#select-state option").length>1){
    		   jQuery('#select-state').removeClass("validation-passed");
    		   if(event&&event.type!="change")jQuery('#select-state').after('<div id="advice-validate-state" class="validation-advice" style="">Please select a state.</div>');
    		   return false;
    	   }
    	   
    	   jQuery('#select-state').addClass("validation-passed");
    	   
    	   return true;
    	   
        },
       validateCreditCardDate : function(){
        	
        	$('#advice-validate-creditcard-expDate').remove();
        	
        	var m = Number(jQuery('#select-expmonth').val());
        	var y = jQuery('#select-expyear').val();
        	var d = new Date(y, m, 1, 0, 0, 0, 0);
        	
        	if($.trim($("#select-expmonth").val())=='' || $.trim($("#select-expyear").val())==''||$.trim($("#select-expmonth").val())==-1 || $.trim($("#select-expyear").val())==-1){
        		return true;
        	}

        	if(d.getTime() < new Date().getTime()){
        		$('#advice-required-select-expyear, #advice-required-select-expmonth').remove();
        		jQuery('#select-expmonth, #select-expyear').removeClass("validation-passed");
        		$('#credit-card').append('<div id="advice-validate-creditcard-expDate" class="validation-advice" style="">Please enter a valid expiration date.</div>');
        		return false;
        	}
        	
        	jQuery('#select-expmonth, #select-expyear').addClass("validation-passed");
        	return true;
        },
        clickContinue: function() { 
            if ($(this).hasClass('disabled')) {
                return false;
            }
            
            if(purchaseFormObject.purchaseTotal == 0) {
                return false;
            }
            
            var shouldScroll = false;
            if($('#header-paymentprompt').is(":visible") && $('#billing-information').is(":visible") && $('#credit-card').is(":visible")) {
            	shouldScroll = true;
            }

            // toggle section visibility
            $('#header-verification, #billing-information-verification, #credit-card-verification, #form-placeorder, #membership-information, #purchased-items').show()
            $('#header-paymentprompt, #billing-information, #credit-card, #form-continue, #server-error, #productList').hide();

            // update the preview section text with the current values of the form fields
            $('#purchase-program :input').each(function() {
                var value = $(this).val();
                if (this.name == 'cardNumber') {
                    value = '...' + value.slice(-4);
                }
                else if (this.tagName == 'SELECT') {
                    value = $(this).find(':selected').text();
                }
                $('.preview_' + this.name).text(value);
            });

            if(shouldScroll) {
            	window.scrollTo(0, 0);
            }
        },

        clickEditItems: function() { 
            $('#productList, #header-paymentprompt, #form-continue').show();
            $('#purchased-items, #header-verification, #form-placeorder').hide();
        },

        clickEditCC: function() { 
            $('#credit-card, #header-paymentprompt, #form-continue').show();
            $('#credit-card-verification, #header-verification, #form-placeorder').hide();
        },

        clickEditBilling: function() { 
            $('#billing-information, #header-paymentprompt, #form-continue').show();
            $('#billing-information-verification, #header-verification, #form-placeorder').hide();
        },

        clickCancel: function() {
            $('#header-paymentprompt, #billing-information, #credit-card, #form-continue').show();
            $('#header-verification, #billing-information-verification, #credit-card-verification, #form-placeorder, #membership-information').hide();

            window.scrollTo(0, 0);
        },

        clickUpdateOrder: function() {
            if ($(this).hasClass('disabled')) {
                return false;
            }
            if(purchaseFormObject.purchaseTotal == 0) {
                $('#productList').show();
                $('#purchased-items').hide();
            } else {
                $('#purchased-items').show();
                $('#productList').hide();
            }
        },

        changeCart: function() {
            purchaseFormObject.updateCartButton();
            $('#' + this.value).toggle(this.checked);
            $(this).closest('.order-option').find('.column.last').toggleClass('disabled', !this.checked);

            var amount = purchaseFormObject.getCartAmount(this);
            if (this.checked) {
                 purchaseFormObject.purchaseTotal += amount;
            }
            else {
                purchaseFormObject.purchaseTotal -= amount;
            }

            $('.order-total-amount').text('$' + purchaseFormObject.purchaseTotal + '.00');
        },

        updateCartButton: function() {
            var valid = $('input.program-choice:checked').length > 0;
            $('#error-enrollment').toggle(!valid);
            this.validateForm();
        },

        initializeCartSection: function() {
            $('input.program-choice:checked').each(function() {
                $('#' + this.value).show();
                purchaseFormObject.purchaseTotal += purchaseFormObject.getCartAmount(this);
            });

            $('.order-total-amount').text('$' + purchaseFormObject.purchaseTotal + '.00');

            this.clickUpdateOrder();
        },

        getCartAmount: function(el) {
            return parseInt($(el).closest('.order-option').find('.column.last').text().replace('$', ''));
        },

        // if there are any required fields that haven't been marked as validated, disable the Continue button
        validateForm: function(event) {
        	
            var el = $(this);
            if (el.hasClass('required')) {
            	if ( this.name == 'state' ) {
            		el.toggleClass('validation-passed', window.purchaseFormObject.validateState(event));
            	}else if ( this.name == 'expireMonth' || this.name == 'expireYear') {
                    el.toggleClass('validation-passed', window.purchaseFormObject.validateCreditCardDate());            		
            	}else {
                    el.toggleClass('validation-passed', el.val().length > 0);            		
            	}
            }
            
            $('#continue').toggleClass('disabled', $('.required:not(.validation-passed)').length > 0);
        }
    };
})(jQuery);

// initialize the form
jQuery(document).ready(function($) {
    
	purchaseFormObject.init();
    
});

// initialize the Javascript validation library
Event.onDOMReady(function() {
    if ($('purchase-program')) {
        new Validation('purchase-program', { immediate: true } );
    }
});