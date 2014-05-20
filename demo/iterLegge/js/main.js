var map = {}, steps = [], iterStatus = {}, playInterval = false;

function init() {
	var dataUrl = "json/38775.json";
	
	$.getJSON(dataUrl, function(data) {
		var row, dataProposta, container,
			newData = {
			    groups: {}
			};
			
		for(var i = 0; i < data.results.bindings.length; i++) {
			row = data.results.bindings[i];
			if(!newData.dataProposta) {
				newData.dataProposta = row.dataPresentazione.value;
				newData.nameProposta = row.ramo.value+row.numeroFase.value;
				newData.sourceProposta = row.ramo.value;
			}
			newData.groups[row.progrIter.value] = newData.groups[row.progrIter.value] || [];
			newData.groups[row.progrIter.value].push(row);
		}
		
		initSteps(newData);
		
		$(document).on('click','.itemClick',function(){
		   showDetails(map[$(this).attr("id")], this);
		});
	});
}

function initSteps(data) {
    clearStatus();
    steps[0] = {
        activate: $.proxy(fillInitialData, this, data),
        deactivate: function() {
            $("#proposta").toggleClass("active");
        }
    };
    steps[1] = {
        activate: function() {
            var type = (data.sourceProposta == "C") ? "camera" : "senato";
            $("#topArrow ."+type).fadeIn();
            $("#"+type+" legend").toggleClass("active");
        },
        deactivate: function() {
           var type = (data.sourceProposta == "C") ? "camera" : "senato";
           $("#"+type+" legend").toggleClass("active");
        }
    };
    
    for(var group in data.groups) {
        steps.push({
            activate: $.proxy(actionGroup, this, data.groups[group], true),
            deactivate: $.proxy(actionGroup, this, data.groups[group]),
        });
    }
    
    steps.push({
        activate: $.proxy(setApproveValue, this, data)
    });
}

function clearStatus() {
    iterStatus.currentStep = -1;
    $("#prevStep").addClass("disabled");
    $("#approvazione").removeClass("active");
    $("#approvazione").removeClass("notApproved");
    $("#bottomArrow line").hide();
    $("#topArrow line").hide();
    $("#centerArrow line").hide();
    $("fieldset .itemClick").remove();
    $("#proposta .data").html("");
    $("#progressBarWidget").attr("aria-valuenow", 0).css("width", "0%");
}

function setApproveValue(data) {
    var isApprovato = isApproved(data);
    if(isApprovato) {
        $("#approvazione").toggleClass("active");
        $("#bottomArrow line").fadeIn();
    } else {
        $("#approvazione").toggleClass("notApproved");
    }
}

function isApproved(data) {
    for(var group in data.groups) {
        for(var i = 0; i < data.groups[group].length; i++) {
            if(data.groups[group][i].stato.value.match("approvato definitivamente")) {
                return true;
            }
        }
    }
    return false;
}

function actionGroup(group, activate) {
    var id = group[0].numeroFase.value,
        parentId = $("#"+id).parent("fieldset").attr("id");
    
    $("#"+id).toggleClass("active");
    $("#"+parentId+ " legend").toggleClass("active");
}

function fillInitialData(data) {
    $("#proposta").toggleClass("active");
    $("#proposta .data").html(data.dataProposta+" "+data.nameProposta);
    for(var group in data.groups) {
        container = (data.groups[group][0].ramo.value == "C") ? "#camera" : "#senato";
        var nameF = data.groups[group][0].ramo.value+" "+data.groups[group][0].numeroFase.value;
        var item = addPropostaItem(container, group+". "+nameF, data.groups[group][0].numeroFase.value,  data.groups[group]);
    }
}

function showDetails(fase, el) {
	container = (fase[0].ramo.value == "C") ? "#detailsCamera" : "#detailsSenato";
	var elements = [];
	$(container).show();
	$(container+" ul").html("");
	for(var i = 0; i < fase.length; i++) {
		var list = '<li>'+fase[i].dataStato.value+' - '+fase[i].label.value+'</li>';
		if(elements.indexOf(list) == -1) {
			$(container+" ul").append(list);
			elements.push(list);
		}
		
	}
}

function addPropostaItem(container, name, id, group) {
	var item = '<div><button id="'+id+'" type="button" class="btn btn-default btn-circle itemClick">'+name+'</button></div>';
	 
	map[id] = group;
	
	$(container).append(item);
	
	return item;
}

function getParentSize(el) {
    var parent = $(el).parent();
    return {
        w: parent.width(),
        h: parent.height()
    };
}

function createArrowMarker(svg) {
    svg.append("svg:defs").selectAll("marker")
    .data(["arrow"])
    .enter().append("svg:marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 7)
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5Z");
}



function createArrows(svg, nodes, links) {
    createArrowMarker(svg);
    svg.selectAll("line")
    .data(links)
    .enter()
    .append("svg:line")
    .attr("x1", function(d) { return nodes[d.s].x; })
    .attr("y1", function(d) { return nodes[d.s].y; })
    .attr("x2", function(d) { return nodes[d.t].x; })
    .attr("y2", function(d) { return nodes[d.t].y; })
    .attr("class", 
        function(d) {
            var cls = "link arrow";
            return (d.cls) ? cls+" "+d.cls : cls;
        })
    .attr("marker-end", "url(#arrow)");
}

function createTopArrows() {
    var selector = "#topArrow svg",
        svg = d3.select(selector),
        width = $(selector).width(),
        height = $(selector).height(),
        middle = width/2,
        cameraWidth = $("#camera").width(),
        padding = {
            topY: 5,
            bottomY: 10,
            bottomX: 50
        },
        nodes = [{
            x : middle,
            y : padding.topY
        }, {
            x : cameraWidth - padding.bottomX,
            y : height - padding.bottomY
        }, {
            x : width - cameraWidth + padding.bottomX,
            y : height - padding.bottomY
        }],
        links = [{s:0,t:1, cls: "camera"}, {s:0,t:2,  cls: "senato"}];

    createArrows(svg, nodes, links);
}

function createBottomArrows() {
    var selector = "#bottomArrow svg",
        svg = d3.select(selector),
        width = $(selector).width(),
        height = $(selector).height(),
        middle = width/2,
        cameraWidth = $("#camera").width(),
        padding = {
            topY: 5,
            topX: 50,
            bottomY: 15,
            bottomX: 20
        },
        nodes = [{
            x : cameraWidth - padding.topX,
            y : padding.topY
        },{
            x : width - cameraWidth + padding.topX,
            y : padding.topY
        }, {
            x : middle - padding.bottomX,
            y : height - padding.bottomY
        }, {
            x : middle+padding.bottomX,
            y : height - padding.bottomY
        }],
        links = [{s:0,t:2}, {s:1,t:3}];
    
    createArrows(svg, nodes, links);
}

function createCenterArrows() {
    var selector = "#centerArrow svg",
        arrowPadding = 10,
        svg = d3.select(selector), 
        middle = $(selector).height()/2,
        nodes = [{
            x : arrowPadding,
            y : middle
        },{
            x : $(selector).width()-arrowPadding,
            y : middle
        }],
        links = [{s:0,t:1, cls: "camera"}, {s:1,t:0, cls: "senato"}];
        
    createArrows(svg, nodes, links);
}

function createSvgNodes() {
    $("#centerArrow").width($("#senato").position().left-$("#centerArrow").position().left);
    $("#centerArrow").height($("#cameraSenato").height());

    d3.selectAll("#topArrow, #bottomArrow, #centerArrow").append("svg").attr("width", function() {
        return getParentSize(this).w;
    }).attr("height", function() {
        return getParentSize(this).h;
    });

    createTopArrows();
    createBottomArrows();
    createCenterArrows();
    $("line.arrow").hide();
}

function moveToNextStep() {
    console.log("move");
    if(steps[iterStatus.currentStep] && $.isFunction(steps[iterStatus.currentStep].deactivate)) {
        steps[iterStatus.currentStep].deactivate();
    }
    iterStatus.currentStep++;
    if(steps[iterStatus.currentStep] && $.isFunction(steps[iterStatus.currentStep].activate)) {
        steps[iterStatus.currentStep].activate();
    }
    
    var perc = ((100/steps.length)*(iterStatus.currentStep+1));
    $("#progressBarWidget").attr("aria-valuenow", perc).css("width", perc+"%");
    
    $("#prevStep").removeClass("disabled");
    
    if(perc > 100) {
        finishMoving();
    } else {
        $("#nextStep").removeClass("disabled");
    }
}

function finishMoving() {
    clearInterval(playInterval);
    $("#playPause").removeClass("glyphicon-pause");
    $("#playPause").removeClass("glyphicon-play");
    $("#playPause").addClass("glyphicon-repeat");
    $("#nextStep").addClass("disabled");
}

function moveToPrevStep(onlyDeactivate) {
    if(steps[iterStatus.currentStep] && $.isFunction(steps[iterStatus.currentStep].deactivate)) {
        steps[iterStatus.currentStep].deactivate();
    }
    iterStatus.currentStep--;
    if(!onlyDeactivate) {
        if(steps[iterStatus.currentStep] && $.isFunction(steps[iterStatus.currentStep].activate)) {
            steps[iterStatus.currentStep].activate();
        }    
    }
    
    var perc = ((100/steps.length)*(iterStatus.currentStep+1));
    $("#progressBarWidget").attr("aria-valuenow", perc).css("width", perc+"%");
}

function playOrPause() {
     if($("#playPause").is(".glyphicon-repeat")) {
         $("#playPause").toggleClass("glyphicon-repeat");
         clearStatus();
         playInterval = setInterval(moveToNextStep, 1000);
     } else if($("#playPause").is(".glyphicon-pause")) {         clearInterval(playInterval);
     } else {
        moveToNextStep();
        playInterval = setInterval(moveToNextStep, 1000);
     }
     
     $("#playPause").toggleClass("glyphicon-play");
     $("#playPause").toggleClass("glyphicon-pause");
}

$(function() {
	$("#detailsCamera").hide();
	$("#detailsSenato").hide();
    $("#nextStep").click(moveToNextStep);
    $("#prevStep").click(moveToPrevStep);
    $("#playPause").click(playOrPause);
	createSvgNodes();
	init();

});
