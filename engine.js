var Engine, Renderer, Geometry, Cube_Factory;
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
            ctx.fillStyle = "white";
          } else if (Object.prototype.toString.call( object ) === '[object Array]') { // Assume it is 3D point data
            console.log('Array!');
            ctx.fillStyle = object[3];
          } else {
            type = object.type;
            if (type === 'square') { // For a square
              ctx.fillStyle = object.colour;
            } else {
              console.log('Error: Unknown shape: ' + type);
              engine.stop();
            }
          }
          
          // Draw square on screen
          ctx.fillRect(x * unitx, y * unity, unitx, unity);
          
        });
        
        $('#fps').text(engine.getFrameRate());
        $('#timestep').text(engine.getTimeStep());
      },
      redrawPerPixel : function () {
        var id, d, i;
        
        id = ctx.createImageData(canvas.width, canvas.height);
        d  = id.data;
        
        engine.eachCanvasIndex(function(object, i) {
          
          if (object === null) { // No object
            d[i]     = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
            d[i + 3] = 255;
          } else if (object === 'square') { // For a square
            d[i]     = 255;
            d[i + 1] = 255;
            d[i + 2] = 0;
            d[i + 3] = 255;
          }
          
        });
        
        ctx.putImageData(id, 0, y);
        
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
    var timestep = 1; // ms, to start with
    var lastFrameCount = 0;
    var frameCount = 0;
    var TheLoopIsScheduled = false;
    var data = [];
    var view;
    var TheIndex;
    
    function countFrames() {
      lastFrameCount = frameCount;
      frameCount = 0;
      setTimeout(countFrames, 1000);
    }
    
    // The main loop
    function TheLoop() {
      // Account keeping
      TheLoopIsScheduled = false;
      frameCount++;
      
      // Start timer
      var start = new Date().getTime();
      
      // Step the world
      step();
      
      // Redraw the screen
      renderer.redraw();
      
      // End timer and set time step appropriately
      timestep = (new Date().getTime() - start);

      if (go) scheduleTheLoop();
    }
    
    function scheduleTheLoop() {
      if (!TheLoopIsScheduled) {
        TheLoopIsScheduled = true;
        setTimeout(TheLoop, 0);
      }
    }
    
    // Step the world by timestep ms
    function step() {
      // Nothing so far
    };
    
    function findObject(x, y) {
      for (var o in data) {
        if (Geometry.isPointInsideShape(data[o], {x : x, y : y})) {
          return data[o];
        }
      }
      return null;
    };
    
    function generateIndex() {
      var start = new Date().getTime();
      
      var datasetMinimums = [];
      var datasetMaximums = [];
      var datasetWidths = [];
      var maxwidth;
      var datasetCenters = [];
      var threshhold = 5;
      
      // Assume data are 3D points for now and that there are at least one
      datasetMinimums[0] = data[0][0];
      datasetMinimums[1] = data[0][1];
      datasetMinimums[2] = data[0][2];
      datasetMaximums[0] = data[0][0];
      datasetMaximums[1] = data[0][1];
      datasetMaximums[2] = data[0][2];
      
      for (var n = 1; n < data.length; n++) {
        if (data[n][0] < datasetMinimums[0]) {
          datasetMinimums[0] = data[n][0];
        }
        if (data[n][1] < datasetMinimums[1]) {
          datasetMinimums[1] = data[n][1];
        }
        if (data[n][2] < datasetMinimums[2]) {
          datasetMinimums[2] = data[n][2];
        }
        
        if (data[n][0] > datasetMaximums[0]) {
          datasetMaximums[0] = data[n][0];
        }
        if (data[n][1] > datasetMaximums[1]) {
          datasetMaximums[1] = data[n][1];
        }
        if (data[n][2] > datasetMaximums[2]) {
          datasetMaximums[2] = data[n][2];
        }
      }
      
      // Calculate dataset widths
      datasetWidths[0] = datasetMaximums[0] - datasetMinimums[0];
      datasetWidths[1] = datasetMaximums[1] - datasetMinimums[1];
      datasetWidths[2] = datasetMaximums[2] - datasetMinimums[2];
      
      // Find largest maximum
      if (datasetWidths[0] < datasetWidths[1]) {
        if (datasetWidths[1] < datasetWidths[2]) {
          maxwidth = datasetWidths[2];
        } else {
          maxwidth = datasetWidths[1];
        }
      } else {
        if (datasetWidths[0] < datasetWidths[2]) {
          maxwidth = datasetWidths[2];
        } else {
          maxwidth = datasetWidths[0];
        }
      }
      
      TheIndex = Cube_Factory.newCube(null, 0, 0, 0, maxwidth); // TODO make local when done
      
      for (var d in data) {
        TheIndex.insertObject(data[d]);
      }
      
      var time = new Date().getTime() - start;
      console.log('Generated index in ' + time + 'ms');
    };
    
    var that = {
      getTheIndex : function () {
        return TheIndex;
      },
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
            if (!go) break;
          }
        }
      },
      eachCanvasIndex : function (handler) {
        var max = y * x;
        for (var i = 0; i < max; i+=4) {
          handler(findObject(x, y), i);
          if (!go) break;
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
      getTimeStep : function () {
        return timestep;
      },
      setData : function (newData) {
        console.log('engine.setData()');
        data = newData;
        
        generateIndex();
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
      
      if (type === 'square') { // makeShape('square', pt1, pt2)
        shape.pt1 = arguments[1];
        shape.pt2 = arguments[2];
        shape.colour = 'rgb(' + arguments[3][0] + ',' + arguments[3][1] + ',' + arguments[3][2] + ')';
      } else if (type === 'line') {
        shape.pt1 = arguments[1];
        shape.pt2 = arguments[2];
        shape.width = arguments[3];
        shape.colour = 'rgb(' + arguments[4][0] + ',' + arguments[4][1] + ',' + arguments[4][2] + ')';
      } else {
        console.log('Error: Unknown shape type: ' + type);
        Engine.stop();
      }
      
      return shape;
    },
    isPointInsideShape : function(shape, pt) {
      if (shape.type === 'square') {
        return pt.x >= shape.left && pt.x < shape.right && pt.y >= shape.top && pt.y < shape.bottom;
      } else if (shape.type === 'rect') {
        return false;
      } else if (shape.type === 'line') {
        return false;
      } else if (Object.prototype.toString.call( shape ) === '[object Array]') {
        return false;
      } else {
        console.log('Error: Unknown shape type ' + shape.type);
        Engine.stop();
      }
    },
    isLineIntersectingShape : function(shape, line) {
      if (shape.type === 'square') {
        return pt.x >= shape.left && pt.x < shape.right && pt.y >= shape.top && pt.y < shape.bottom;
      } else if (shape.type === 'rect') {
        return false;
      } else if (shape.type === 'line') {
        return false;
      } else if (Object.prototype.toString.call( shape ) === '[object Array]') {
        return false;
      } else {
        console.log('Error: Unknown shape type ' + shape.type);
        Engine.stop();
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
        Engine.stop();
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
  };
  
  Cube_Factory = function () { // It's important that these objects are serialisable
    var Cube = function(parent, x, y, z, w) {
      console.log('new cube (' +x+ ', ' +y+ ', ' +z+ ', ' +w+ ')');
      this.parent = parent; // necessary?
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
      this.objects = []; // For now we use a simple array, later maybe some sort of linked list
      this.neighbours = {
        xp : null,
        xn : null,
        yp : null,
        yn : null,
        zp : null,
        zn : null
      }
    };
    Cube.prototype.getParent = function() {
      return this.parent;
    };
    Cube.prototype.insertObject = function(object) {
      if (this.children === undefined) {
        console.log('Inserting into this cube: ' + object);
        this.objects[this.objects.length] = object;
        if (this.objects.length > Cube_Factory.threshold) {
          this.createChildren();
          this.distributeObjectsAmongChildren();
        }
      } else {
        // Determine which child cube to insert the object into
        if (object[0] < this.x) {
          if (object[1] < this.y) {
            if (object[2] < this.z) {
              console.log('Inserting into cube 7: ' + object);
              this.children[7].insertObject(object); 
            } else {
              console.log('Inserting into cube 3: ' + object);
              this.children[3].insertObject(object);
            }
          } else {
            if (object[2] < this.z) {
              console.log('Inserting into cube 5: ' + object);
              this.children[5].insertObject(object);
            } else {
              console.log('Inserting into cube 1: ' + object);
              this.children[1].insertObject(object);
            }
          }
        } else {
          if (object[1] < this.y) {
            if (object[2] < this.z) {
              console.log('Inserting into cube 6: ' + object);
              this.children[6].insertObject(object);
            } else {
              console.log('Inserting into cube 2: ' + object);
              this.children[2].insertObject(object);
            }
          } else {
            if (object[2] < this.z) {
              console.log('Inserting into cube 4: ' + object);
              this.children[4].insertObject(object);
            } else {
              console.log('Inserting into cube 0: ' + object);
              this.children[0].insertObject(object);
            }
          }
        }
      }
    };
    Cube.prototype.consolidateChildrenIntoParent = function() {
      console.log('consolidateChildrenIntoParent');
      this.children = children;
    };
    Cube.prototype.createChildren = function() {
      console.log('createChildren');
      if (this.children === undefined) {
        this.children = [];
        var offset = this.w/4;
        
        this.children[this.children.length] = Cube_Factory.newCube(this, this.x+offset, this.y+offset, this.z+offset, this.w/2);
        this.children[this.children.length] = Cube_Factory.newCube(this, this.x-offset, this.y+offset, this.z+offset, this.w/2);
        
        this.children[this.children.length] = Cube_Factory.newCube(this, this.x+offset, this.y-offset, this.z+offset, this.w/2);
        this.children[this.children.length] = Cube_Factory.newCube(this, this.x-offset, this.y-offset, this.z+offset, this.w/2);
        
        this.children[this.children.length] = Cube_Factory.newCube(this, this.x+offset, this.y+offset, this.z-offset, this.w/2);
        this.children[this.children.length] = Cube_Factory.newCube(this, this.x-offset, this.y+offset, this.z-offset, this.w/2);
        
        this.children[this.children.length] = Cube_Factory.newCube(this, this.x+offset, this.y-offset, this.z-offset, this.w/2);
        this.children[this.children.length] = Cube_Factory.newCube(this, this.x-offset, this.y-offset, this.z-offset, this.w/2);
        
      } else {
        console.log('createChildren: Cube already has children'); // TODO remove when Cube is complete
      }
    };
    Cube.prototype.distributeObjectsAmongChildren = function() {
      console.log('distributeObjectsAmongChildren');
      if (this.children !== undefined) {
        for (var o in this.objects) {
          this.insertObject(this.objects[o]);
        }
        this.objects = [];
      } else {
        console.log('distributeObjectsAmongChildren: Cube does not have children'); // TODO remove when Cube is complete
      }
    };
    Cube.prototype.setNeighbour = function(neighbours, param, ref) {
      if (neighbours[param] !== undefined) {
        neighbours[param] = ref;
      }
    };
    Cube.prototype.serialise = function() {
      // TODO
    };
    
    return {
      newCube : function (parent, center_x, center_y, center_z, w) {
        return new Cube(parent, center_x, center_y, center_z, w);
      },
      threshold : 4
    };
  }();
  
  $(document).ready(function() {
    var width = 45;
    var height = 30;
    
    var red = [255, 0, 0, 255],
        green = [0, 255, 0, 255],
        blue = [0, 0, 255, 255];
    presetDatasets.dataset1 = [Geometry.makeShape('square', [5, 10, 0], [15, 20, 0], red), 
                               Geometry.makeShape('square', [1, 1, 0], [44, 29, 0], green),
                               Geometry.makeShape('square', [-1, -1, 0], [46, 31, 0], blue)];
    presetDatasets.dataset2 = [Geometry.makeShape('square', [5, 15, 0], [15, 25, 0], red), 
                               Geometry.makeShape('square', [1, 1, 0], [44, 23, 0], green),
                               Geometry.makeShape('square', [-1, -1, 0], [42, 31, 0], blue)];
    presetDatasets.dataset3 = Geometry.generateRandomCloudOfPointData(5, 1000, 3, red);
    presetDatasets.dataset4 = Geometry.generateRandomCloudOfPointData(100, 1000, 3, red);
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
    
    Engine.start();
    
  });
  
})(this.jQuery);
