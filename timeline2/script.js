alert('ciao');
var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(10, "%");

var svg = d3.select("body")
	.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.tsv("data17.tsv", type, function(error, data) {
  x.domain(data.map(function(d) { return d.idddl; }));
  y.domain([0, d3.max(data, function(d) { return d.age; })]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Lunghezza approvazione");

  svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", function(d) { return d.natura; })
      .attr("x", function(d) { return x(d.idddl); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.age); })
      .attr("height", function(d) { return height - y(d.age); });
});

function type(d) {
  d.age = +d.age;
  return d;
}
