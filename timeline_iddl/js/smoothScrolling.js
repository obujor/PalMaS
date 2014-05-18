/*
 * from http://www.hughlashbrooke.com
 */
function scrollToElement( target ) {
    var topoffset = 30;
    var speed = 800;
    var destination = jQuery( target ).offset().top - topoffset;
    jQuery( 'html:not(:animated),body:not(:animated)' ).animate( { scrollTop: destination}, speed, function() {
        window.location.hash = target;
    });
    return false;
}