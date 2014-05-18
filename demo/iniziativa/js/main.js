var margin = 20,
    diameter = 960;

var color = d3.scale.linear()
    .domain([-1, 5])
    .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
    .interpolate(d3.interpolateHcl);

var pack = d3.layout.pack()
    .padding(2)
    .size([diameter - margin, diameter - margin])
    .value(function(d) { return d.size; })

var svg = d3.select("body").append("svg")
    .attr("width", diameter)
    .attr("height", diameter)
  .append("g")
    .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");
    
    
var appendLegend = function(d) {
	if(d.depth == 1) {
		var perc = (d.children.length/totalChildren*100).toFixed(2);
		var name = '<span class="listName">'+d.name+'</span>';
		var percColors = '';
		
		for(var color in colorsCounter[d.name]) {
			var colorPerc = (colorsCounter[d.name][color]/d.children.length*100).toFixed(2);
			var cName = (color == "#00DA00") ? "Approvati" : "Respinti";
			percColors+='<div><span class="cName">'+cName+'</span><span class="listPercColor" style="color: '+color+'">'+colorPerc+'%</span></div>'
		}
		
		var percHtml = '<div class="initResults">'+percColors+'</div>';
		d3.select("#list").append("div").attr("class", "iniziativaPerc").html(name+percHtml);
	}
}

var calcTotal = function(data) {
	var total = 0,
		color;
	
	colorsCounter = {};	
		
	for(var i = 0; i < data.children.length; i++) {
		total += data.children[i].children.length;
		colorsCounter[data.children[i].name] = {};
		for(var j = 0; j < data.children[i].children.length; j++) {
			color = data.children[i].children[j].color;
			if(color) {
				if(!colorsCounter[data.children[i].name][color]) colorsCounter[data.children[i].name][color] = 0;
				colorsCounter[data.children[i].name][color]++;
			}
		}
	}
	totalChildren = total;
}

d3.json("json/data.json", function(error, root) {
  if (error) return console.error(error);

  var focus = root,
      nodes = pack.nodes(root),
      view;
      
      calcTotal(root);

  var circle = svg.selectAll("circle")
      .data(nodes)
    .enter().append("circle")
      .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
      .style("fill", function(d) { appendLegend(d); return d.color ? d.color : d.children ? color(d.depth) : null; })
      .style("stroke", function(d) { return d.stroke ? d.stroke : null; })
      .style("stroke-width", function(d) { return d.stroke ? 1.5 : null; })
      .on("click", function(d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); });

  var text = svg.selectAll("text")
      .data(nodes)
    .enter().append("text")
      .attr("class", "label")
      .style("font-size", "20px")
      .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
      .style("display", function(d) { return d.parent === root ? null : "none"; })
      .text(function(d) { return d.name; });

  var node = svg.selectAll("circle,text");

  d3.select("body")
      .style("background", color(-1))
      .on("click", function() { zoom(root); });

  zoomTo([root.x, root.y, root.r * 2 + margin]);

  function zoom(d) {
    var focus0 = focus; focus = d;

    var transition = d3.transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .tween("zoom", function(d) {
          var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
          return function(t) { zoomTo(i(t)); };
        });

    transition.selectAll("text")
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
        .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
        .each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
  }

  function zoomTo(v) {
    var k = diameter / v[2]; view = v;
    node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
    circle.attr("r", function(d) { return d.r * k; });
  }
});

d3.select(self.frameElement).style("height", diameter + "px");
