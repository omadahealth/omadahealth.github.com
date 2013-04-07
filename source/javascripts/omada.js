$(document).ready(function(){
	// Menu JS
	$(function(){
	  //remember previous state so we dont jquery ourselves to death
	  scrolled = false;  
	  $(window).scroll(function(){
	    var y = $(this).scrollTop();
	    if(y > 10){
	      $('.banner-title').css({
							'opacity' : 1-(y/250)
				}); 
			} else {
				$('.banner-title').css({
							'opacity' : 1
				}); 
			};
	    if(y > 24){
	      if(!scrolled){
	        scrolled = true;
	        $('#logo-item').addClass('mini');
	        $('#main-menu #logo-item a').css('height', '19px');
	      }
	    } else {
	      if(scrolled){
	        scrolled = false;
 	        $('#logo-item').removeClass('mini');
 	        $('#main-menu #logo-item a').css('height', '45px');
	      }
	    }
	  });
	});
	
});
