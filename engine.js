var Engine, Renderer, Geometry;
var presetDatasets = {};
var presetViews = {};

(function($) {

  var makeRenderer = function(canvas, width, height) {
    var canvas = $(canvas).get(0);
    var ctx = canvas.getContext("2d");
    var engine;
    var view;
    var perPixel;
    var unitx, unity;
    
    var that = {
      init : function (system) {
        engine = system;
        that.initMouseHandling();
        engine.setScreenSize(width, height);
      },
      width : null, 
      height : null,
      setScreenSize : function (width, height) {
        console.log('setScreenSize()');
        if (width !== undefined && height !== undefined) {
          that.width = width;
          that.height = height;
          if (width === canvas.width && height === canvas.height) {
            perPixel = true;
          } else {
            perPixel = false;
          }
        } else {
          that.width = canvas.width;
          that.height = canvas.height;
          perPixel = true;
        }
        
        if (perPixel) {
          that.redraw = that.redrawPerPixel;
        } else {
          that.redraw = that.redrawPerArea;
          unitx = canvas.width / that.width;
          unity = canvas.height / that.height;
        }
        
        if (engine !== undefined) {
          engine.setScreenSize(width, height);
        }
      },
      redrawPerArea : function () {
        var type;
        
        engine.eachPixel(function(object, x, y) {
          if (object === null) { // No object
            type = null; // TODO remove
            ctx.fillStyle = "white";
          } else {
            type = object.type;
            if (type === 'square2d') { // For a square
              ctx.fillStyle = object.colour;
            } else {
              console.log('Unknown shape: ' + type);
            }
          }
          
          // Draw square on screen
          ctx.fillRect(x * unitx, y * unity, unitx, unity);
          
          if (type === null) // TODO remove
            console.log('drawing area (' + x * unitx + ', ' + y * unity + ', ' + unitx + ', ' + unity + ') of no object ');
          
        });
        
        $('#fps').text(engine.getFrameRate());
      },
      redrawPerPixel : function () { // TODO finish it
        var id, d, i;
        
        engine.eachPixel(function(object, x, y) {
          if (x === 0) {
            id = ctx.createImageData(canvas.width, 1);
            d  = id.data;
            i = 0;
          } else if (x === canvas.width - 1) {
            ctx.putImageData(id, 0, y);
          }
          
          if (object === null) { // No object
            d[i]     = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
            d[i + 3] = 255;
          } else if (object === 'square2d') { // For a square
            d[i]     = 255;
            d[i + 1] = ((y % 2 === 0) ? 254 : 0 );
            d[i + 2] = 0;
            d[i + 3] = 255;
          }
          i += 4;
          
        });
        
        $('#fps').text(engine.getFrameRate());
      },
      initMouseHandling: function () {
        console.log('renderer.initMouseHandling()');
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e) {
            console.log('click');
            /*var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
            dragged = engine.nearest(_mouseP);

            if (dragged.node.name === 'a') {
              _mouseP = null;
              dragged = null;
              return
             }

            if (dragged && dragged.node !== null) {
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true;
            }

            $(canvas).bind('mousemove', handler.dragged);
            $(window).bind('mouseup', handler.dropped);

            return false;*/
          },
          dragged:function(e) {
            console.log('drag');
            /*var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);

            if (dragged && dragged.node !== null) {
              var p = engine.fromScreen(s);
              dragged.node.p = p;
            }

            return false;*/
          },

          dropped:function(e){
            console.log('drop');
            /*if (dragged===null || dragged.node===undefined) return;
            if (dragged.node !== null) dragged.node.fixed = false;
            dragged.node.tempMass = 1000;
            dragged = null;
            $(canvas).unbind('mousemove', handler.dragged);
            $(window).unbind('mouseup', handler.dropped);
            _mouseP = null;
            return false;*/
          }
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);

      },
    }
    
    that.setScreenSize(width, height);
    
    return that;
  };
  
  var makeEngine = function () {
    var renderer;
    var width, height;
    var go = false;
    var timestep = 10; // ms, to start with
    var lastFrameCount = 0;
    var frameCount = 0;
    var TheLoopIsScheduled = false;
    var data = [];
    var view;
    
    function countFrames() {
      lastFrameCount = frameCount;
      frameCount = 0;
      setTimeout(countFrames, 1000);
    }
    
    // The main loop
    function TheLoop() {
      TheLoopIsScheduled = false;
      frameCount++;
      
      //start timer
      
      step();
      renderer.redraw();
      
      //end timer
      //set time step appropriately
      
      if (go) scheduleTheLoop();
    }
    
    function scheduleTheLoop() {
      if (!TheLoopIsScheduled) {
        TheLoopIsScheduled = true;
        setTimeout(TheLoop, timestep);
      }
    }
    
    // Step the world by timestep ms
    function step() {
    };
    
    function findObject(x, y) {
      for (var o in data) {
        if (Geometry.isPointInsideShape(data[o], {x : x, y : y})) {
          return data[o];
        }
      }
      return null;
    };
    
    var that = {
      setRenderer : function (newRenderer) {
        console.log('engine.setRenderer()');
        
        renderer = newRenderer;
        renderer.init(that);
        
        scheduleTheLoop();
        countFrames();
        
      },
      setScreenSize : function (newWidth, newHeight) {
        console.log('engine.setScreenSize()');
        width = newWidth;
        height = newHeight;
      },
      getScreenSize : function () {
        return {width : width, height : height};
      },
      eachPixel : function (handler) {
        for (var y = 0; y < height; y++) {
          for (var x = 0; x < width; x++) {
            handler(findObject(x, y), x, y);
          }
        }
      },
      start : function () {
        console.log('engine.start()');
        go = true;
        scheduleTheLoop();
      },
      stop : function () {
        console.log('engine.stop()');
        go = false;
      },
      tick : function () {
        console.log('engine.tick()');
        scheduleTheLoop();
      },
      getFrameRate : function () {
        return lastFrameCount;
      },
      setData : function (newData) {
        console.log('engine.setData()');
        data = newData;
      },
      getData : function () {
        return data;
      },
      setView : function (newView) {
        console.log('engine.setView()');
        view = newView;
      },
      getView : function () {
        return view;
      },
    };
    
    return that;
  };
  
  Geometry = {
    makeShape : function(type) {
      var shape = {};
      shape.type = type;
      
      if (type === 'square2d') { // makeShape('square2d', left, top, right, bottom)
        shape.left = arguments[1];
        shape.top = arguments[2];
        shape.right = arguments[3];
        shape.bottom = arguments[4];
        shape.colour = 'rgb(' + arguments[5][0] + ',' + arguments[5][1] + ',' + arguments[5][2] + ')';
      } else if (type === 'line') {
        shape.start = arguments[1];
        shape.finish = arguments[2];
        shape.width = arguments[3];
        shape.colour = 'rgb(' + arguments[4][0] + ',' + arguments[4][1] + ',' + arguments[4][2] + ')';
      }
      
      return shape;
    },
    isPointInsideShape : function(shape, pt) {
      if (shape.type === 'square2d') {
        return pt.x >= shape.left && pt.x < shape.right && pt.y >= shape.top && pt.y < shape.bottom;
      } else if (shape.type === 'rect') {
        return false;
      } else if (shape.type === 'line') {
        return false;
      } else {
        console.log('Unknown shape');
      }
    },
    isLineIntersectingShape : function(shape, line) {
      if (shape.type === 'square2d') {
        return pt.x >= shape.left && pt.x < shape.right && pt.y >= shape.top && pt.y < shape.bottom;
      } else if (shape.type === 'rect') {
        return false;
      } else if (shape.type === 'line') {
        return false;
      } else {
        console.log('Unknown shape');
      }
    },
    makeViewPoint : function (position, direction, convexity, width, height) {
      var view = {};
      
      view.pos = position;
      if (convexity === 0) { // flat plane of rays
        view.rays = [];
        for (var y = -height/2; y <= height/2; y++) {
          view.rays[y] = [];
          for (var x = -width/2; x <= width/2; x++) {
            view.rays[y][x] = direction;
          }
        }
      } else if (convexity > 0) {
        
      } else {
        console.log('Error (Geometry.makeViewPoint): convexity < 0 or something else');
      }
      
      return view;
    },
    generateRandomCloudOfPointData : function (numberOfPoints, widthOfDataSet, numberOfDimensions, pointColour, existantDataArray) {
      var data, datum;
      if (existantDataArray !== undefined) {
        data = existantDataArray;
      } else {
        data = [];
      }
      
      var colour = 'rgb(' + pointColour[0] + ',' + pointColour[1] + ',' + pointColour[2] + ')';
      
      for (var n = 0; n < numberOfPoints; n++) {
        datum = [];
        
        for (var d = 0; d < numberOfDimensions; d++) {
          datum[d] = widthOfDataSet * (Math.random() - 0.5); 
        }
        
        datum[numberOfDimensions] = colour;
        
        data[data.length] = datum;
      }
      
      return data;
    }
  }
  
  $(document).ready(function() {
    var width = 45;
    var height = 30;
    
    presetDatasets.dataset1 = [Geometry.makeShape('square2d', 5, 10, 15, 20, [255, 0, 0]), 
                               Geometry.makeShape('square2d', 1, 1, 44, 29, [0, 255, 0]),
                               Geometry.makeShape('square2d', -1, -1, 46, 31, [0, 0, 255])];
    presetDatasets.dataset2 = [Geometry.generateRandomCloudOfPointData(20, 1000, 3, [0, 255, 0])];
    presetDatasets.dataset3 = [];
    presetDatasets.dataset4 = [];
    presetDatasets.dataset5 = [];
    presetDatasets.defaultDataset = presetDatasets.dataset1;

    presetViews.view1 = Geometry.makeViewPoint([0,0,0], [1,0,0], 0, width, height);
    presetViews.view2 = null;
    presetViews.view3 = null;
    presetViews.view4 = null;
    presetViews.view5 = null;
    presetViews.defaultView = presetViews.view1;
    
    Engine = makeEngine();
    Renderer = makeRenderer('#viewport', width, height);
    Engine.setRenderer(Renderer);
    
    Engine.setData(presetDatasets.defaultDataset);
    Engine.setView(presetViews.defaultView);
    
  });
  
})(this.jQuery);

