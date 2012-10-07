/*
 +	Class PDFRenderer
 +
 +	Based on SVGRenderer by the mrdoob,
 +	utilizing jspdf.js found here: https://github.com/MrRio/jsPDF
 +
 +	fjenett for motionbank.org and myself, 2012
 +
 L + + + + + + + + + + + + + + + + + + + + */

if ( !jsPDF ) { alert('You are missing jspdf.js, get it here: https://github.com/MrRio/jsPDF') };
if ( jsPDF && THREE && !('PDFRenderer' in THREE) ) {
	THREE.PDFRenderer = (function(){

		/*
		 +	Private vars
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

		var renderData, elements, lights;
		var pathCount, circleCount, lineCount;
		var vec1, vec2, vec3, vec4;

		/*
		 +	Private functions
		 +
		 L + + + + + */

		function calculateLights( lights ) {

			var l, ll, light, lightColor;

			ambientLight.setRGB( 0, 0, 0 );
			directionalLights.setRGB( 0, 0, 0 );
			pointLights.setRGB( 0, 0, 0 );

			for ( l = 0, ll = lights.length; l < ll; l++ ) {

				light = lights[ l ];
				lightColor = light.color;

				if ( light instanceof THREE.AmbientLight ) {

					ambientLight.r += lightColor.r;
					ambientLight.g += lightColor.g;
					ambientLight.b += lightColor.b;

				} else if ( light instanceof THREE.DirectionalLight ) {

					directionalLights.r += lightColor.r;
					directionalLights.g += lightColor.g;
					directionalLights.b += lightColor.b;

				} else if ( light instanceof THREE.PointLight ) {

					pointLights.r += lightColor.r;
					pointLights.g += lightColor.g;
					pointLights.b += lightColor.b;

				}

			}

		}

		function calculateLight( lights, position, normal, color ) {

			var l, ll, light, lightColor, lightPosition, amount;

			for ( l = 0, ll = lights.length; l < ll; l ++ ) {

				light = lights[ l ];
				lightColor = light.color;

				if ( light instanceof THREE.DirectionalLight ) {

					lightPosition = light.matrixWorld.getPosition().normalize();

					amount = normal.dot( lightPosition );

					if ( amount <= 0 ) continue;

					amount *= light.intensity;

					color.r += lightColor.r * amount;
					color.g += lightColor.g * amount;
					color.b += lightColor.b * amount;

				} else if ( light instanceof THREE.PointLight ) {

					lightPosition = light.matrixWorld.getPosition();

					amount = normal.dot( vector3.sub( lightPosition, position ).normalize() );

					if ( amount <= 0 ) continue;

					amount *= light.distance == 0 ? 1 : 1 - Math.min( position.distanceTo( lightPosition ) / light.distance, 1 );

					if ( amount == 0 ) continue;

					amount *= light.intensity;

					color.r += lightColor.r * amount;
					color.g += lightColor.g * amount;
					color.b += lightColor.b * amount;

				}
			}
		}

		var setStyleFromMaterial = function ( material ) {

			pdf.setDrawColor( material.color.r*255, material.color.g*255, material.color.b*255 );
			pdf.setFillColor( material.color.r*255, material.color.g*255, material.color.b*255 );

			// TODO: material.opacity ??

			if ( material.wireframe ) {
				pdf.setLineWidth( material.wireframeLinewidth && !isNaN(material.wireframeLinewidth) ? material.wireframeLinewidth : 1 );
				pdf.setLineCap( threeToPdfLineCap( material.wireframeLinecap ) );
				pdf.setLineJoin( threeToPdfLineJoin( material.wireframeLinejoin ) );
			} else {
				pdf.setLineWidth( material.linewidth && !isNaN(material.linewidth) ? material.linewidth : 1 );
				pdf.setLineCap( threeToPdfLineCap( material.linecap ) );
				pdf.setLineJoin( threeToPdfLineJoin( material.linejoin ) );
			}
		}

		var threeToPdfLineCap = function ( linecap ) {
			//console.log( linecap );
			return linecap || 0;
		}
		
		var threeToPdfLineJoin = function ( linejoin ) {
			//console.log( linejoin );
			return linejoin || 0;
		}

		var setColorForElement = function ( element, material ) {

			if ( material instanceof THREE.MeshBasicMaterial ) {

				color.copy( material.color );

			} else if ( material instanceof THREE.MeshLambertMaterial ) {

				if ( enableLighting ) {

					var diffuse = material.color;
					var emissive = material.emissive;

					color.r = ambientLight.r;
					color.g = ambientLight.g;
					color.b = ambientLight.b;

					calculateLight( lights, element.centroidWorld, element.normalWorld, color );

					color.r = diffuse.r * color.r + emissive.r;
					color.g = diffuse.g * color.g + emissive.g;
					color.b = diffuse.b * color.b + emissive.b;

				} else {

					color.copy( material.color );

				}

			} else if ( material instanceof THREE.MeshDepthMaterial ) {

				var w = 1 - ( material.__2near / (material.__farPlusNear - element.z * material.__farMinusNear) );
				color.setRGB( w, w, w );

			} else if ( material instanceof THREE.MeshNormalMaterial ) {

				color.setRGB( normalToComponent( element.normalWorld.x ), 
							  normalToComponent( element.normalWorld.y ), 
							  normalToComponent( element.normalWorld.z ) );

			}

			pdf.setDrawColor( color.r*255, color.g*255, color.b*255 );
			pdf.setFillColor( color.r*255, color.g*255, color.b*255 );
		}

		function renderParticle( v1, element, material, scene ) {

			if ( material instanceof THREE.LineBasicMaterial ) {

				setStyleFromMaterial( material );
			}

			pdf.lines( [[1, 1]],
					   v1.positionScreen.x, v1.positionScreen.y,
					   [1,1],
					   'S' );  // outline only by default
		}

		function renderLine ( v1, v2, element, material, scene ) {

			if ( material instanceof THREE.LineBasicMaterial ) {

				setStyleFromMaterial( material );
			}

			pdf.lines( [[v2.positionScreen.x-v1.positionScreen.x, v2.positionScreen.y-v1.positionScreen.y]],
					   v1.positionScreen.x, v1.positionScreen.y,
					   [1,1],
					   'S' );  // outline only by default
		}

		function renderFace3 ( v1, v2, v3, element, material, scene ) {

			self.info.render.vertices += 3;
			self.info.render.faces ++;

			setStyleFromMaterial( material );

			setColorForElement( element, material );

			pdf.triangle( v1.positionScreen.x, v1.positionScreen.y,
						  v2.positionScreen.x, v2.positionScreen.y,
						  v3.positionScreen.x, v3.positionScreen.y,
						  material.wireframe ? 'S' : 'F' );

		}

		function renderFace4 ( v1, v2, v3, v4, element, material, scene ) {

			self.info.render.vertices += 4;
			self.info.render.faces ++;

			setStyleFromMaterial( material );

			setColorForElement( element, material );

			var lines = [];
			//lines.push( [v1.positionScreen.x,  v1.positionScreen.y] );
			lines.push( [v2.positionScreen.x - v1.positionScreen.x, v2.positionScreen.y - v1.positionScreen.y] );
			lines.push( [v3.positionScreen.x - v2.positionScreen.x, v3.positionScreen.y - v2.positionScreen.y] );
			lines.push( [v4.positionScreen.x - v3.positionScreen.x, v4.positionScreen.y - v3.positionScreen.y] );
			lines.push( [v1.positionScreen.x - v4.positionScreen.x, v1.positionScreen.y - v4.positionScreen.y] );

			pdf.lines( lines,
					   v1.positionScreen.x,  v1.positionScreen.y,
					   [1,1],
					   material.wireframe ? 'S' : 'F' );
		}

		var normalToComponent = function ( normal ) {
			var component = ( normal + 1 ) * 0.5;
			return component < 0 ? 0 : ( component > 1 ? 1 : component );
		}

		/*
		 +	Class PDFRenderer
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

		var positionScreenToPage = function ( position ) {
			position.x *= widthHalf;
			position.x += widthHalf;
			position.y *= -heightHalf;
			position.y += heightHalf;
		}

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

				// TODO: this only sets size of element, not PDF itself

				width = w; 
				height = h;
				widthHalf = width / 2; 
				heightHalf = height / 2;

				iframe.setAttribute( 'width',  width );
				iframe.setAttribute( 'height', height );

				pdf = new jsPDF( (width > height ? 'landscape' : 'portrait'), 'pt', [w, h] );

				clipRect.set( 0, 0, width, height );
			},
			
			clear : function () {
				// TODO: start new PDF?
			},

			render : function ( scene, camera ) {

				if ( camera instanceof THREE.Camera === false ) {
					console.error( 'THREE.PDFRenderer.render: camera is not an instance of THREE.Camera.' );
					return;
				}

				var e, el, element, material;

				this.autoClear && this.clear();

				self.info.render.vertices = 0;
				self.info.render.faces = 0;

				renderData = projector.projectScene( scene, camera, this.sortObjects, this.sortElements );
				elements = renderData.elements;
				lights = renderData.lights;

				pathCount = 0; circleCount = 0; lineCount = 0;

				enableLighting = lights.length > 0;

				if ( enableLighting ) {
					 calculateLights( lights );
				}

				for ( e = 0, el = elements.length; e < el; e ++ ) {

					element = elements[ e ];

					material = element.material;

					if ( material === undefined || material.visible === false ) continue;

					bboxRect.empty();

					if ( element instanceof THREE.RenderableParticle ) {

						vec1 = element;

						positionScreenToPage( vec1.positionScreen );

						renderParticle( vec1, element, material, scene );

					} else if ( element instanceof THREE.RenderableLine ) {

						vec1 = element.v1; vec2 = element.v2;

						positionScreenToPage( vec1.positionScreen );
						positionScreenToPage( vec2.positionScreen );

						bboxRect.addPoint( vec1.positionScreen.x, vec1.positionScreen.y );
						bboxRect.addPoint( vec2.positionScreen.x, vec2.positionScreen.y );

						if ( !clipRect.intersects( bboxRect ) ) {
							continue;
						}

						renderLine( vec1, vec2, element, material, scene );

					} else if ( element instanceof THREE.RenderableFace3 ) {

						vec1 = element.v1; vec2 = element.v2; vec3 = element.v3;

						positionScreenToPage( vec1.positionScreen );
						positionScreenToPage( vec2.positionScreen );
						positionScreenToPage( vec3.positionScreen );

						bboxRect.addPoint( vec1.positionScreen.x, vec1.positionScreen.y );
						bboxRect.addPoint( vec2.positionScreen.x, vec2.positionScreen.y );
						bboxRect.addPoint( vec3.positionScreen.x, vec3.positionScreen.y );

						if ( !clipRect.intersects( bboxRect ) ) {
							continue;
						}

						renderFace3( vec1, vec2, vec3, element, material, scene );

					} else if ( element instanceof THREE.RenderableFace4 ) {

						vec1 = element.v1; vec2 = element.v2; vec3 = element.v3; vec4 = element.v4;

						positionScreenToPage( vec1.positionScreen );
						positionScreenToPage( vec2.positionScreen );
						positionScreenToPage( vec3.positionScreen );
						positionScreenToPage( vec4.positionScreen );

						bboxRect.addPoint( vec1.positionScreen.x, vec1.positionScreen.y );
						bboxRect.addPoint( vec2.positionScreen.x, vec2.positionScreen.y );
						bboxRect.addPoint( vec3.positionScreen.x, vec3.positionScreen.y );
						bboxRect.addPoint( vec4.positionScreen.x, vec4.positionScreen.y );

						if ( !clipRect.intersects( bboxRect) ) {
							continue;
						}

						renderFace4( vec1, vec2, vec3, vec4, element, material, scene );

					}

				}

				iframe.src = pdf.output('datauristring');

			}, // render()

			getPDF : function () {
				return pdf;
			}
		};
		
		return PDFRenderer;
	})();
}