d3.json("json/data.json", function(error, root) {
	var fill = d3.scale.category20(),
		dataWords = root.words.slice(0,100);
		dataWords.reverse();

  d3.layout.cloud().size([600, 600])
      .words(dataWords.map(function(d, index) {
        return {text: d.word, size: d.counter*0.3};
      }))
      .padding(5)
      .rotate(function() { return ~~(Math.random() * 3) * 40; })
      .font("Impact")
      .fontSize(function(d) { return d.size; })
      .on("end", draw)
      .start();

  function draw(words) {
    d3.select("body").append("svg")
        .attr("width", 1000)
        .attr("height", 700)
      .append("g")
        .attr("transform", "translate(150,150)")
      .selectAll("text")
        .data(words)
      .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "Impact")
        .style("fill", function(d, i) { return fill(i); })
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
  }
});
