function initViewer(canvas, height, width, ocr, annotations) {
  console.log("🚀 ~ file: viewer.js ~ line 29 ~ initViewer ~ canvas", canvas)
  let viewer = OpenSeadragon({
    id: "seadragon-viewer",
    prefixUrl: "//openseadragon.github.io/openseadragon/images/"
  });

  const canvasHeight = parseInt(height);
  const canvasWidth = parseInt(width);


  // Bounds based on image size.
  let imageBounds = new OpenSeadragon.Rect(0, 0, canvasWidth, canvasHeight);
  console.log("🚀 ~ file: viewer.js ~ line 13 ~ initViewer ~ canvasWidth, canvasHeight", canvasWidth, canvasHeight)
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

  fetch(`/public/data/ocr/${ocr}`)
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

            //           el.addEventListener('mouseover', () => {
            //             // alert('hello');
            //             viewer.setMouseNavEnabled(false);
            //             viewer.gestureSettingsMouse.clickToZoom = false;
            //             viewer.mouseNavEnabled = false;
            //             viewer.panVertical = false;
            //             viewer.panHorizontal = false;
            //           });

            //           el.addEventListener('mouseup', () => {
            //             // alert(window.getSelection().toString())
            //             viewer.setMouseNavEnabled(true);
            //             viewer.gestureSettingsMouse.clickToZoom = true;
            //             viewer.mouseNavEnabled = true;
            //             viewer.panVertical = true;
            //             viewer.panHorizontal = true;
            //           });


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
          });
        });
      }
    )
    .catch(function (err) {
      console.log('Fetch Error :-S', err);
    });

  fetch(`/public/data/annotations/${annotations}`)
    .then(
      function (response) {

        response.json().then(function (data) {
          let svgContainer = viewer.svgOverlay();
          data.resources.forEach((anno) => {
            if (anno.on.selector.item['@type'] != 'RangeSelector') {
              // const fragment = document.createElement('span');
              // fragment.innerHTML = anno.on.selector.item.value;
              // const path = fragment.querySelector('path');
              // path.id = anno['@id'];
              // svgContainer.node().append(path);
            } else {
              // const links = insertLinks(anno, "{{page}}");
              // links.forEach((link) => {
              //   // viewer.addOnceHandler('open', function(event) {

              //   // })
              //   // link.onclick = (event) => {
              //   // console.log("🚀 ~ file: viewer.js ~ line 157 ~ links.forEach ~ event", event)
              //   // };
              //   // link.onmouseleave = () => {
              //   //   document.querySelector(`[data-annotation-id="${anno['@id']}"]`).classList.add('highlight-annotation');
              //   // };
              //   // console.log("🚀 ~ file: viewer.js ~ line 171 ~ links.forEach ~ link", link)
              // });
            }
          });
          data.resources.forEach((anno) => {
            // const fragment = document.createElement('span');
            // fragment.innerHTML = anno.on.selector.item.value;
            // const path = fragment.querySelector('path');
            // path.id = anno['@id'];
            // svgContainer.node().innerHTML += fragment.innerHTML;
            let svgAnnotation = document.getElementById(anno['@id']);
            if (svgAnnotation) {

              svgAnnotation.onmouseenter = (event) => {
                document.querySelector(`[data-annotation-id="${anno['@id']}"]`).classList.add('highlight-annotation')
              }
              svgAnnotation.onmouseleave = (event) => {
                document.querySelector(`[data-annotation-id="${anno['@id']}"]`).classList.remove('highlight-annotation')
              }
            }
            // console.log("🚀 ~ file: Untitled-1 ~ line 239 ~ data.resources.forEach ~ fragment", fragment.innerHTML)
            // fragment.remove();
          });
        });
      }
    )

  // <svg style="left:0%;top:0%;width:100%;height:100%;text-align:left;" class="image-annotation-highlight" viewBox="0 0 5100 3451" xmlns='http://www.w3.org/2000/svg'>
  {
    /*
              <path data-annotation-id="7e0b199d-7e46-4869-abad-fad80fac326d" class="annotator-hl image-annotation-highlight" xmlns="http://www.w3.org/2000/svg" d="M1145.58745,1133.24408h380.45023v0h380.45023v324.97505v324.97505h-380.45023h-380.45023v-324.97505z" data-paper-data="{&quot;strokeWidth&quot;:1,&quot;rotation&quot;:0,&quot;deleteIcon&quot;:null,&quot;rotationIcon&quot;:null,&quot;group&quot;:null,&quot;newlyCreatedStrokeFactor&quot;:5,&quot;newlyCreated&quot;:true,&quot;editable&quot;:true,&quot;annotation&quot;:null}" id="rectangle_5e8c2073-95ae-4db8-bd7b-dc40a2fad501" fill-opacity="0" fill="#00bfff" fill-rule="nonzero" stroke="#00bfff" stroke-width="0.25rem" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"/></svg>
      </svg> */
  }

  // var anno = OpenSeadragon.Annotorious(viewer);
  // anno.addAnnotation(svgAnnotation);
  // console.log(anno.getAnnotations())

  // let svgAnnoOverlay = viewer.svgOverlay();

  //           let xywh = svgAnnotation.on.selector.value.split('=')[1]
  //           let x, y, w, h;
  //           [w, y, w, h] = xywh.split(',')

  //           let d3Rect = d3.select(svgAnnoOverlay.node()).append('rect')
  //               .attr('x', x)
  //               .attr('width', w)
  //               .attr('y', y)
  //               .attr('height', h)
  //               .attr('stroke', 'deeppink')
  //               .attr('stroke-width', 20)
  //               .style('fill-opacity', 0)

  //           let annoEl = document.getElementById('annotation-content');
  //           d3Rect.node().onmouseenter = () => {
  //             annoEl.innerHTML = svgAnnotation.resource.chars
  //           }

  //           d3Rect.node().onmouseleave = () => annoEl.innerHTML = null;

  // console.log(anno.listDrawingTools())
  //    });
  const overlays = [
    document.getElementById('overlay1')
  ];

  overlays.forEach((overlay) => {
    viewer.addOverlay({
      element: overlay,
      location: OpenSeadragon.Rect(3.33, 3.75, 0.2, 0.25)
    })
  })

  viewer.addHandler('canvas-contextmenu', function (event) {
        event.preventDefault = true;
  });

  new OpenSeadragon.MouseTracker({
      userData: 'overlay1.Tracker',
      element: 'overlay1',
      preProcessEventHandler: function (eventInfo) {
        var $target = $(eventInfo.originalEvent.target);
        switch (eventInfo.eventType) {
          case 'pointerdown':
          case 'pointerup':
            // prevent pointerdown/pointerup events from bubbling
            // viewer won't see these events
            eventInfo.stopPropagation = true;
            if ($target.is('a')) {
              // allow user agent to handle clicks
              eventInfo.preventDefault = false;
              // prevents clickHandler call
              eventInfo.preventGesture = true;
            }
            break;
          case 'click':
            // prevent click event from bubbling
            eventInfo.stopPropagation = true;
            if ($target.is('a')) {
              // allow user agent to handle clicks
              eventInfo.preventDefault = false;
            } else {
              // we'll handle clicks
              eventInfo.preventDefault = true;
            }
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
      clickHandler: function(e) {
        $('#overlay1').toggleClass('selected');
      }
  });
}


