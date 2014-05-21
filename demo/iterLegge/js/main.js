var map = {}, steps = [], iterStatus = {}, playInterval = false;

function init() {
	var dataUrl = "json/38775.json";
	
	$.getJSON(dataUrl, function(data) {
		var row, dataProposta, container,
			newData = {
			    groups: {},
			    list: []
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
			newData.list.push(row);
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
        },
        displayDate: data.dataProposta,
        displayInfo: "DDL proposto il "+data.dataProposta
    };
    
    for(var group in data.groups) {
        steps.push({
            activate: $.proxy(actionGroup, this, data.groups[group], steps.length, true),
            deactivate: $.proxy(actionGroup, this, data.groups[group], steps.length),
            displayDate: data.groups[group][0].dataStato.value,
            displayInfo: data.groups[group][0].stato.value,
            infoCls: "info_"+data.groups[group][0].ramo.value
        });
    }
    
    var approvedDate = isApproved(data);
    steps.push({
        activate: $.proxy(setApproveValue, this, data),
        displayDate: approvedDate,
        displayInfo: (approvedDate) ? "Approvato definitivamente" : "",
        infoCls: (approvedDate) ? "alert-success" : "alert-danger"
    });
    
    
    var dateList = steps.filter(function(el) {return el.displayDate;}).map(function(el) {return el.displayDate;});
    var completeDateList = [];
    
    /*var perc = ((100/steps.length)*(i+1));
    var cls = (steps[i].infoCls) ? steps[i].infoCls : "alert-success";
    $("#statusDateButtons").append('<span class="dateWidget '+cls+'" id="date_'+i+'" style="margin-left: '+margin*(i+1)+'px;">'+steps[i].displayDate+"</span>");*/
    for(var i=0; i<dateList.length; i++) {
        var date = dateList[i], nextDate = dateList[i+1];
        completeDateList.push({value: date, big: true});
        if(date && nextDate) {
            var dates = [];
            var records = data.list.filter(function(item) {
                var dateItem = new Date(item.dataAssegnazione.value).getTime();
                var isValid = (dateItem > new Date(date).getTime() && dateItem < new Date(nextDate).getTime());
                if(isValid && dates.indexOf(item.dataAssegnazione.value) == -1) {
                    dates.push(item.dataAssegnazione.value);
                    completeDateList.push({value: item.dataAssegnazione.value});
                }
                return isValid;
            });
        }
    }
    
    var newSteps = [];
    
    $.each(completeDateList, function(index, date) {
        var oldStep = steps.filter(function(el) {return el.displayDate == date.value;});
        if(oldStep.length) {
            oldStep.every(function(el) {
                if (newSteps.indexOf(el) == -1) {
                    newSteps.push(el);
                }
                return el;
            }); 
        } else {
            newSteps.push({displayDate: date.value, dateSmall: true});
        }
    });
    console.log(newSteps);
    var margin = ($("#statusDateButtons").width()/newSteps.length) - 15;
    
    $.each(newSteps, function(index, step) {
        var nextBig = newSteps.filter(function(el, elI) {if(elI > index && !el.dateSmall) return true;})[0];
        console.log(nextBig);
        step.infoCls = (!step.infoCls && step.dateSmall) ? (nextBig) ? nextBig.infoCls : null : step.infoCls;
        var cls = (step.infoCls) ? step.infoCls : "alert-success";
        cls = (step.dateSmall) ? cls+" miniStep" : cls;
        $("#statusDateButtons").append('<span class="dateWidget '+cls+'" id="date_'+i+'" style="margin-left: '+margin*(index+1)+'px;">'+step.displayDate+"</span>");
    });
    
    steps = newSteps;
}

function clearStatus() {
    iterStatus.currentStep = -1;
    $("#prevStep").addClass("disabled");
    $("#approvazione").removeClass("active");
    $("#approvazione").removeClass("notApproved");
    $("#bottomArrow line").hide();
    $("#topArrow line").hide();
    $("#centerArrow line").hide();
    $("#camera .items, #senato .items").empty();
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
    
    return "#approvazione";
}

function isApproved(data) {
    for(var group in data.groups) {
        for(var i = 0; i < data.groups[group].length; i++) {
            if(data.groups[group][i].stato.value.match("approvato definitivamente")) {
                return data.groups[group][i].dataStato.value;
            }
        }
    }
    return false;
}

function actionGroup(group, steps, activate) {
    var id = group[0].numeroFase.value,
        parentId = $("#"+id).parents("fieldset").attr("id");
    
    if(steps == 1) {
        $("#topArrow ."+parentId).fadeIn();
    }
    
    if(activate) {
        if($("#arrow_"+id).length) {
            $("#arrow_"+id).fadeIn();    
        }
    } else {
    }
    $("#"+parentId+ " legend").toggleClass("active");
    $("#"+id).toggleClass("active");
    return "#"+id;
}

function fillInitialData(data) {
    $("#proposta").toggleClass("active");
    $("#proposta .data").html(data.dataProposta+" "+data.nameProposta);
    var camera = [],
        senato = [],
        sequence = [],
        groupByDate = {};
        
    for(var group in data.groups) {
        var obj = {};
        obj.nameF = data.groups[group][0].ramo.value+" "+data.groups[group][0].numeroFase.value;
        obj.displayName = group+". "+obj.nameF;
        obj.id = data.groups[group][0].numeroFase.value;
        obj.group = data.groups[group];
        groupByDate[obj.id] = groupByDate[obj.id] || {};
        for(var i=0; i<data.groups[group].length; i++) {
            var asgnObj = data.groups[group][i];
            groupByDate[obj.id][asgnObj.dataAssegnazione.value] = groupByDate[obj.id][asgnObj.dataAssegnazione.value] || [];
            groupByDate[obj.id][asgnObj.dataAssegnazione.value].push(asgnObj);
        }
        if((data.groups[group][0].ramo.value == "C")) {
            obj.container = "#camera";
            obj.type = "camera";
        } else {
            obj.container = "#senato";
            obj.type = "senato";
        }
        sequence.push(obj);
    }
    
    for(var i = 0; i < sequence.length; i++) {
        var obj = sequence[i];
        $("#camera .items, #senato .items").append('<div></div>');
        addPropostaItem(obj.container+" .items>div:nth-child("+(i+1)+")", obj.displayName, obj.id, obj.group, groupByDate[obj.id]);
    }
    
    GR = groupByDate;
    
    setCenterArrowBox();
    createCenterArrows(sequence);
    $("#centerArrow .arrow").hide();
    return "#proposta";
}

function setCenterArrowBox() {
    var pos = $("#camera .itemClick:nth-child(1)").offset(),
        width = $("#camera .itemClick:nth-child(1)").width(),
        left = pos.left+width;
    $("#centerArrow").width($("#senato .itemClick:nth-child(1)").offset().left-left);
    $("#centerArrow").height($("#cameraSenato").height());
    $("#centerArrow").css({left: left, top: $("#camera").position().top});
    d3.selectAll("#centerArrow svg").attr("width", function() {
        return getParentSize(this).w;
    }).attr("height", function() {
        return getParentSize(this).h;
    });
}

function showDetails(data, el) {
    console.log(data);
	container = "#commissioni"+data.group[0].ramo.value;
	var elements = [];
	$(container).animate({ opacity: 1 });
	$(container+" .items").html("");
	
	for(var date in data.groupDate) {
	    var list = "";
	    for(var i = 0; i < data.groupDate[date].length; i++) {
            list += '<li>'+data.groupDate[date][i].label.value+'</li>';
            /*if(elements.indexOf(list) == -1) {
                $(container+" ul").append(list);
                elements.push(list);
            }*/
        }
	    $(container+" .items").append('<fieldset class="commissDate"><legend>'+date+'</legend><ul>'+list+'</ul></fieldset>');
	}
}

function addPropostaItem(container, name, id, group, groupByDate) {
	var item = '<button id="'+id+'" type="button" class="btn-circle itemClick">'+name+'</button>';
	 
	map[id] = {group: group, groupDate: groupByDate};
	
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
    .attr("id", function(d) { return (d.id) ? d.id : ""; })
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
        posCamera = $("#camera").position(),
        posSenato = $("#senato").position(),
        padding = {
            topY: 5,
            bottomY: 10,
            bottomX: 20
        },
        nodes = [{
            x : middle,
            y : padding.topY
        }, {
            x : posCamera.left+(cameraWidth/2),
            y : height - padding.bottomY
        }, {
            x : posSenato.left+(cameraWidth/2),
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
        posCamera = $("#camera").position(),
        posSenato = $("#senato").position(),
        padding = {
            topY: 5,
            topX: 20,
            bottomY: 15,
            bottomX: 20
        },
        nodes = [{
            x : posCamera.left+(cameraWidth/2),
            y : padding.topY
        },{
            x : posSenato.left+(cameraWidth/2),
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

function createCenterArrows(buttons) {
    var selector = "#centerArrow svg",
        arrowPadding = 10,
        svg = d3.select(selector), 
        middle = $(selector).height()/2,
        nodes, links,
        posSvg = $(selector).offset(),
        svgWidth = $(selector).width(),
        counters = {};
        
        nodes = [];
        links = [];
    
    console.log(buttons);
    for(var i = 0; i < buttons.length; i++) {
        var obj = buttons[i], nextObj = buttons[i+1];
        if(obj && nextObj) {
            var pos1 = getPosButton(obj.id, posSvg, svgWidth),
                pos2 = getPosButton(nextObj.id, posSvg, svgWidth);
                
            pos2.y = pos2.y - 10;
            nodes.push(pos1);
            nodes.push(pos2);
            links.push({s: nodes.length-2, t: nodes.length-1, cls: obj.type, id: "arrow_"+nextObj.id});
        }
        
    }
    createArrows(svg, nodes, links);
}

function getPosButton(id, posSvg, svgWidth) {
    var posEl = $("#"+id).offset(), result = {}, padding= {
        x: 15,
        y: 5
    };
    if(posEl.left < posSvg.left) {
        result.x = padding.x;
    } else {
        result.x = svgWidth - padding.x;
    }
    result.y = posEl.top - posSvg.top+ ($("#"+id).height()/2) + padding.y;
    return result;
}

function getTargetNode(nodes, type, index) {
    for(var i = 0; i < nodes.length; i++) {
        if(i>index && nodes[i].type == type) {
            return i;
        }
    }
}

function createSvgNodes() {
    d3.selectAll("#topArrow, #bottomArrow, #centerArrow").append("svg").attr("width", function() {
        return getParentSize(this).w;
    }).attr("height", function() {
        return getParentSize(this).h;
    });

    createTopArrows();
    createBottomArrows();
    $("line.arrow").hide();
}

function moveToNextStep() {
    var node = null;
    console.log("move");
    $("#date_"+iterStatus.currentStep).toggleClass("activeColor");
    if(steps[iterStatus.currentStep] && $.isFunction(steps[iterStatus.currentStep].deactivate)) {
        steps[iterStatus.currentStep].deactivate();
    }
    iterStatus.currentStep++;
    if(steps[iterStatus.currentStep] && $.isFunction(steps[iterStatus.currentStep].activate)) {
        node =  steps[iterStatus.currentStep].activate();
        if(node) {
                $('html, body').animate({
                    scrollTop: $(node).offset().top - ($("#topNavBar").height() + 20)
                }, 500);
            }
    }
    
    var perc = ((100/steps.length)*(iterStatus.currentStep+1));
    
    $("#progressBarWidget").attr("aria-valuenow", perc).css("width", perc+"%");
    
    $("#date_"+iterStatus.currentStep).toggleClass("activeColor");
    
    var info = "";
    if(steps[iterStatus.currentStep] && steps[iterStatus.currentStep].displayInfo) {
        info = "<strong>"+steps[iterStatus.currentStep].displayInfo+"</strong>";   
    }
    
    var classInfo = "alert alert-success";
    if(steps[iterStatus.currentStep] && steps[iterStatus.currentStep].infoCls) {
        classInfo = "alert "+steps[iterStatus.currentStep].infoCls;
    }
    
    $("#statusBarInfo").attr("class", classInfo);
    
    $("#statusBarInfo").html(info);
    
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
	$(".commissioni").css({opacity: 0 });
    $("#nextStep").click(moveToNextStep);
    $("#prevStep").click(moveToPrevStep);
    $("#playPause").click(playOrPause);
    
	createSvgNodes();
	init();
});
