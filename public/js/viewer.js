function initViewer(canvas, height, width, baseUrl, ocr, annotations) {
  const canvasHeight = parseInt(height);
  const canvasWidth = parseInt(width);

  let viewer = OpenSeadragon({
    id: "seadragon-viewer",
    prefixUrl: "//openseadragon.github.io/openseadragon/images/"
  });

  // Bounds based on image size.
  let imageBounds = new OpenSeadragon.Rect(0, 0, canvasWidth, canvasHeight);
  viewer.viewport.fitBounds(imageBounds, true);

  viewer.addTiledImage({
    x: imageBounds.x,
    y: imageBounds.y,
    width: imageBounds.width,
    tileSource: {
      "@context": "http://iiif.io/api/image/2/context.json",
      "@id": canvas,
      "height": canvasHeight,
      "width": canvasWidth,
      "profile": ["http://iiif.io/api/image/2/level2.json"],
      "protocol": "http://iiif.io/api/image",

    }
  });

  const ocrEl = document.getElementById('ocr');

  fetch(`${baseUrl}/overlays/ocr/${ocr}`)
    .then(
      function (response) {
        if (response.status !== 200) {
          console.log('Looks like there was a problem. Status Code: ' +
            response.status);
          return;
        }

        response.json().then(function (data) {
          data.resources.forEach(resource => {
            ocrEl.innerHTML = ocrEl.innerHTML + resource.resource.chars;
          });

          data.resources.forEach(word => {
            let location = word.on.selector.value.split('=')[1].split(',').map(function (i) {
              return parseInt(i);
            });
            let box = new OpenSeadragon.Rect(location[0], location[1], location[2], location[3]);
            let el = document.getElementById(word['@id']);
            el.style.width = 'auto';
            el.width = location[2]

            let ocrOverlay = {
              element: el,
              location: box,
              onDraw: function (position, size, element) {
                /*
                  This is where all the magic happens.
                  Overrides OpenSeadragon.Overlay's `onDraw` function to scale
                  and rotate the OCR overlay elements. The majority is directly
                  copied from https://github.com/openseadragon/openseadragon/blob/e72a60e5bc06d666c329508df3236061f9bbb406/src/overlay.js#L269-L295
                  The only additions are to scale the font size and letter spacing
                  of the overlay.
                */

                let style = element.style;
                style.left = `${parseInt(position.x)}px`;
                style.top = parseInt(position.y) + "px";
                style.fontSize = `${size.y / 1.6}px`;
                style.whiteSpace = 'nowrap';

                /*
                  When the Readux app creates the span elements for the OCR,
                  it includes a `data-letter-spacing` attribute. This is a
                  percentage of the initial calculated letter spacing of the
                  overall width of the element.

                */

                style.letterSpacing = `${parseFloat(element.getAttribute('data-letter-spacing')) * size.x}px`;

                if (this.width !== null) {
                  style.width = `${size.x}px`;
                }

                if (this.height !== null) {
                  style.height = `${size.y}px`;
                }

                let positionAndSize = this._getOverlayPositionAndSize(viewer.viewport);
                let rotate = positionAndSize.rotate;
                let transformOriginProp = OpenSeadragon.getCssPropertyWithVendorPrefix(
                  'transformOrigin');
                let transformProp = OpenSeadragon.getCssPropertyWithVendorPrefix(
                  'transform');
                if (transformOriginProp && transformProp) {
                  if (rotate) {
                    style[transformOriginProp] = this._getTransformOrigin();
                    style[transformProp] = "rotate(" + rotate + "deg)";
                  } else {
                    style[transformOriginProp] = "";
                    style[transformProp] = "";
                  }
                }

                if (style.display !== 'none') {
                  style.display = 'block';
                }
              }
            };
            viewer.addOverlay(ocrOverlay);

            new OpenSeadragon.MouseTracker({
              element: el.id,
              preProcessEventHandler: function (eventInfo) {
                // var $target = $(eventInfo.originalEvent.target);
                switch (eventInfo.eventType) {
                  case 'pointerdown':
                  case 'pointerup':
                    // prevent pointerdown/pointerup events from bubbling
                    // viewer won't see these events
                    eventInfo.stopPropagation = true;
                    break;
                  case 'click':
                    // prevent click event from bubbling
                    eventInfo.stopPropagation = true;
                    break;
                  case 'contextmenu':
                    // allow context menu to pop up
                    eventInfo.stopPropagation = true;
                    eventInfo.preventDefault = false;
                    break;
                  default:
                    break;
                }
              },

              overHandler: function(event) {
                const span =  document.getElementById(event.originalEvent.target.id);
                if (!span.firstElementChild) return;
                const links = document.querySelectorAll(`[data-id="${span.firstElementChild.getAttribute('data-id')}"]`);
                if (links) {
                  const annotationCard = document.querySelector(`[data-annotation-id="${links[0].getAttribute('data-id')}"]`);
                  if (annotationCard) {
                    annotationCard.classList.add('highlight-annotation');
                    annotationCard.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
                  }
                  for (let link of links) {
                    link.classList.add('highlight-text-annotation');
                  }
                }
              },

              leaveHandler: function(event) {
                const span =  document.getElementById(event.originalEvent.target.id);
                if (!span.firstElementChild) return;
                const links = document.querySelectorAll(`[data-id="${span.firstElementChild.getAttribute('data-id')}"]`);
                if (links) {
                  const annotationCard = document.querySelector(`[data-annotation-id="${links[0].getAttribute('data-id')}"`);
                  if (annotationCard) {
                    annotationCard.classList.remove('highlight-annotation');
                  }
                  for (let link of links) {
                    link.classList.remove('highlight-text-annotation');
                  }
                }
              }
            });
          });
        });
      }
    )
    .catch(function (err) {
      console.log('Fetch Error :-S', err);
    });

  fetch(`${baseUrl}/overlays/annotations/${annotations}`)
    .then(
      function (response) {
        response.json().then(function (data) {
          let svgContainer = viewer.svgOverlay();
          data.resources.forEach((anno) => {
            if (anno.on.selector.item['@type'] != 'RangeSelector') {
              const fragment = document.createElement('span');
              fragment.innerHTML = anno.on.selector.item.value;
              const path = fragment.querySelector('path');
              path.id = anno['@id'];
              svgContainer.node().append(path);
            } else {
              const links = insertLinks(anno, "{{page}}");
              links.forEach((link) => {
                link.setAttribute('data-id', anno['@id']);
              });
            }
          });

          data.resources.forEach((anno) => {
            const svgAnnotation = document.getElementById(anno['@id']);
            const textAnnotations = document.querySelectorAll(`[data-id="${anno['@id']}"]`);
            const annotationCard = document.querySelector(`[data-annotation-id="${anno['@id']}"]`);

            if (svgAnnotation) {
              new OpenSeadragon.MouseTracker({
                element: svgAnnotation,

                overHandler: function(event) {
                  annotationCard.classList.add('highlight-annotation');
                  annotationCard.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
                  event.originalEvent.target.style.fill = 'yellow';
                  event.originalEvent.target.style.fillOpacity = '0.5';
                },

                leaveHandler: function(event) {
                  annotationCard.classList.remove('highlight-annotation')
                  event.originalEvent.target.style.fill = '';
                  event.originalEvent.target.style.fillOpacity = '0';
                }
              });

              annotationCard.onmouseenter = (event) => {
                annotationCard.classList.add('highlight-annotation');
                annotationCard.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
                svgAnnotation.style.fill = 'yellow';
                svgAnnotation.style.fillOpacity = '0.5';
              }

              annotationCard.onmouseleave = (event) => {
                annotationCard.classList.remove('highlight-annotation')
                svgAnnotation.style.fill = '';
                svgAnnotation.style.fillOpacity = '0';
              }
            }

            if (textAnnotations.length > 0) {
              annotationCard.onmouseenter = () => {
                annotationCard.classList.add('highlight-annotation');
                for (let annotation of textAnnotations) {
                  annotation.classList.add('highlight-text-annotation');
                }
              }

              annotationCard.onmouseleave = () => {
                annotationCard.classList.remove('highlight-annotation');
                for (let annotation of textAnnotations) {
                  annotation.classList.remove('highlight-text-annotation');
                }
              }
            }
          });
        });
      }
    )
}
