
/*
 * CountVis - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data						-- the actual data: perDayData
 */

CountVis = function(_parentElement, _data, _eventHandler ){
	this.parentElement = _parentElement;
	this.data = _data;
    this.eventHandler = _eventHandler;

	this.initVis();
}


/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

CountVis.prototype.initVis = function(){
	var vis = this;

	vis.margin = { top: 40, right: 0, bottom: 60, left: 60 };

	vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right,
	vis.height = 300 - vis.margin.top - vis.margin.bottom;

	// SVG drawing area
	vis.svg = d3.select("#" + vis.parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
		.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


	// Define the SVG clipping path to cover the entire svg region
	vis.svg.append("defs")
		.append("clipPath")
		.attr("id", "clip")
		.append("rect")
		.attr("width", vis.width)
		.attr("height", vis.height);

    // Scales and axes
    vis.x = d3.scaleTime()
        .range([0, vis.width]);

    vis.y = d3.scaleLinear()
        .range([vis.height, 0]);

    vis.xAxis = d3.axisBottom()
        .scale(vis.x);

    vis.yAxis = d3.axisLeft()
        .scale(vis.y)
        .ticks(6);


	// Set domains
	var minMaxY= [0, d3.max(vis.data.map(function(d){ return d.count; }))];
	vis.y.domain(minMaxY);

	var minMaxX = d3.extent(vis.data.map(function(d){ return d.time; }));
	vis.x.domain(minMaxX);

	vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.height + ")");

	vis.svg.append("g")
			.attr("class", "y-axis axis");

	// Axis title
	vis.svg.append("text")
			.attr("x", -50)
			.attr("y", -8)
			.text("Votes");


	// Append a path for the area function, so that it is later behind the brush overlay
	vis.timePath = vis.svg.append("path")
			.attr("class", "area area-time");

    // Define the D3 path generator
    vis.area = d3.area()
        .curve(d3.curveStep)
        .x(function(d) {
            return vis.x(d.time);
        })
        .y0(vis.height)
        .y1(function(d) { return vis.y(d.count); });

    // Initialize timeline labels
	d3.select("#timeLabel-min").text(dateFormatter(vis.x.domain()[0]));
	d3.select("#timeLabel-max").text(dateFormatter(vis.x.domain()[1]));

	// Initialize brushing component
	vis.currentBrushRegion = null;
	vis.brush = d3.brushX()
		.extent([ [0,0], [vis.width, vis.height] ])
		.on("brush", function() {
			// we brush on time scale
			// current brushed region is an array of current x values selected from [0...vis.width, 0...vis.height]
			// translate it to Dates using the vis.x scale
			// invert() function returns the corresponding domain value of the x scale (Date) given a value from the range
			vis.currentBrushRegion = d3.event.selection;
			vis.currentBrushRegion = vis.currentBrushRegion.map(vis.x.invert);

			// var selectionRange = d3.brushSelection(d3.select(".brush").node());
			// var selectionDomain = selectionRange.map(vis.x.invert);
			//
			// vis.x.domain(selectionDomain)

			// Trigger the event 'selectionChanged' of our event handler
			$(vis.eventHandler).trigger("selectionChanged", vis.currentBrushRegion);
		})

	// Append brush component here
	vis.brushGroup = vis.svg.append("g")
		.attr("class", "brush")

	// Add zoom component
	vis.xOrig = vis.x; // save original scale

	// function that is being called when user zooms
	vis.zoomFunction = function() {
		vis.x = d3.event.transform.rescaleX(vis.xOrig);
		vis.xAxis.scale(vis.x);
		// vis.x = xScaleModified;

		if(vis.currentBrushRegion) {
			console.log("updated again...")
			vis.brushGroup.call(vis.brush.move, vis.currentBrushRegion.map(vis.x));
			vis.updateVis();
		}
		// vis.updateVis();
	}

	vis.zoom = d3.zoom()
		.on("zoom", vis.zoomFunction)
		.scaleExtent([1,20]);

	// disable mousedown and drag in zoom, when you activate zoom (by .call)
	vis.brushGroup.call(vis.zoom)
		.on("mousedown.zoom", null)
		.on("touchstart.zoom", null);

	// (Filter, aggregate, modify data)
	vis.wrangleData();
}



/*
 * Data wrangling
 */

CountVis.prototype.wrangleData = function(){
	var vis = this;

	this.displayData = this.data;

	// Update the visualization
	vis.updateVis();
}



/*
 * The drawing function - should use the D3 update sequence (enter, update, exit)
 * Function parameters only needed if different kinds of updates are needed
 */

CountVis.prototype.updateVis = function(){
	var vis = this;

	console.log("about to call vis brush")
	// Call brush component here
	vis.brushGroup.call(vis.brush);

	// Call the area function and update the path
	// D3 uses each data point and passes it to the area function.
	// The area function translates the data into positions on the path in the SVG.
	vis.timePath
			.datum(vis.displayData)
			.attr("d", vis.area)
        .attr("clip-path", "url(#clip)");

	console.log(`Updated Domain: ${vis.x.domain()[0]} - ${vis.x.domain()[1]}`)

	// Call axis functions with the new domain
	vis.svg.select(".x-axis").call(vis.xAxis);
	vis.svg.select(".y-axis").call(vis.yAxis);
}

/*
 On selection change, the timeline labels should change according to the brushed selection
 */
CountVis.prototype.onSelectionChange = function(selectionStart, selectionEnd) {
	var vis = this;

	d3.select("#timeLabel-min").text(dateFormatter(selectionStart));
	d3.select("#timeLabel-max").text(dateFormatter(selectionEnd));
}

// CountVis.prototype.onButtonClicked = function() {
// 	var vis = this;
//
//
// }