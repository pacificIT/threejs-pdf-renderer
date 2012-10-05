/*
 +	Class PDFRenderer
 +
 +	Based on SVGRenderer by the mrdoob,
 +	utilizing jspdf.js found here: http://code.google.com/p/jspdf/
 +
 +	fjenett for motionbank.org and myself, 2012
 +
 L + + + + + + + + + + + + + + + + + + + + */

if ( !jsPDF ) { alert('You are missing jspdf.js, get it here: http://code.google.com/p/jspdf/') };
if ( jsPDF && THREE && !'PDFRenderer' in THREE ) {
	THREE.PDFRenderer = (function(){

		/*
		 +	Private vars, functions
		 +
		 L + + + + + */

		var self;
		var domElement, iframe, pdf;

		var /*THREE.Projector*/ 	projector;
		var /*THREE.Rectangle*/ 	clipRect, 
									bboxRect;
		var /*THREE.Color*/ 		color, 
									ambientLight, 
									directionalLights, 
									pointLights;
		var /*THREE.Vector3*/		vector3;

		var quality = 1;
		var width, height, widthHalf, heightHalf;
		var enableLighting = false;

		/*
		 +	Class
		 +
		 L + + + + + */

		var PDFRenderer = function () {

			console.log( 'THREE.PDFRenderer', THREE.REVISION );

			self = this;
			iframe = document.createElement('iframe');
			iframe.setAttribute('type',  'application/pdf');
			iframe.setAttribute('style', 'border:0x solid transparent !important');

			projector = new THREE.Projector();

			clipRect = new THREE.Rectangle();
			bboxRect = new THREE.Rectangle();

			color = new THREE.Color();
			ambientLight = new THREE.Color();
			directionalLights = new THREE.Color();
			pointLights = new THREE.Color();

			vector3 = new THREE.Vector3();

			this.domElement = iframe;
			this.autoClear = true;
			this.sortObjects = true;
			this.sortElements = true;
		};

		PDFRenderer.prototype = {
			info : {
				render: {
					vertices: 0,
					faces: 0 
				} 
			},
			setQuality : function( q ) {
				switch( q ) {
					case "high": quality = 1; break;
					case "low":  quality = 0; break;
				}
			},
			setSize : function( w, h ) {

				width = w; 
				height = h;
				widthHalf = width / 2; 
				heightHalf = height / 2;

				iframe.setAttribute( 'width',  width );
				ifrmae.setAttribute( 'height', height );

				clipRect.set( - widthHalf, - heightHalf, widthHalf, heightHalf );
			},
			clear : function () {
				
			}
		};
		
		return PDFRenderer;
	})();
}