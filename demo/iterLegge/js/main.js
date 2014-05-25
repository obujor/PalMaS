var steps = [], iterStatus = {}, playInterval = false, drawCenterArrows = null;

function init(data) {
	var newData = {
			ddlList: data
		};
		
	newData.dataProposta = data[0].dataPresentazione;
	newData.nameProposta = data[0].fase;
	newData.sourceProposta = data[0].ramo;

	initSteps(newData);
}

function initSteps(data) {
    clearStatus();
    steps[0] = {
        activate: $.proxy(fillInitialData, this, data),
        deactivate: function() {
            $("#proposta").toggleClass("active");
        },
        infoCls: "info_"+data.sourceProposta,
        displayDate: data.dataProposta,
        displayInfo: "DDL proposto il "+data.dataProposta
    };
    
    $.each(data.ddlList, function(index, ddl) {
        var dateStato = new Date(ddl.dataStato).getTime(),
            aDates = Object.keys(ddl.assegnazioni).sort(function(a, b) {
            return new Date(a).getTime() > new Date(b).getTime();
        }), prevDates = aDates.filter(function(a) { return new Date(a).getTime() < dateStato;}),
            nextDates = aDates.filter(function(a) {return prevDates.indexOf(a) == -1;}),
            addMiniStep = function(i, date) {
                steps.push({
                    activate: $.proxy(actionMiniStep, this, ddl, date, steps.length),
                    deactivate: $.proxy(deactivateMiniStep, this, ddl, date, steps.length),
                    displayDate: date,
                    infoCls: "info_"+ddl.ramo,
                    dateSmall: true
                });
            };
        ddl.assegnazioniSortedDates = aDates;
        $.each(prevDates, addMiniStep);
        
        steps.push({
            activate: $.proxy(actionGroup, this, ddl, steps.length, true),
            deactivate: $.proxy(actionGroup, this, ddl, steps.length),
            displayDate: ddl.dataStato,
            displayInfo: ddl.stato,
            infoCls: "info_"+ddl.ramo
        });
        $.each(nextDates, addMiniStep);     
    });
    
    
    
    var approvedDate = isApproved(data);
    if(approvedDate) {
		steps.push({
			activate: $.proxy(setApproveValue, this, data),
			displayDate: approvedDate,
			displayInfo: (approvedDate) ? "Approvato definitivamente" : "",
			infoCls: (approvedDate) ? "alert-success" : "alert-danger"
		});
	}
    
    var margin = ($("#statusDateButtons").width()/steps.length) - 15;
    
    $.each(steps, function(index, step) {
        var cls = (step.infoCls) ? step.infoCls : "alert-success",
            prevStep = steps[index-1],
            badge = "";
        cls = (step.dateSmall) ? cls+" miniStep" : cls;
        if(!prevStep || (prevStep.infoCls && prevStep.infoCls != step.infoCls)) {
            step.changedRamo = true;
            if(index != steps.length-1) {
                badge = '<span class="badge '+step.infoCls+'"></span>';    
            }
        }
        step.datePos = Math.round(margin*(index+1));
        step.dateId = "date_"+index;
        $("#statusDateButtons").append('<span class="dateWidget '+cls+'" id="'+step.dateId+'" style="margin-left: '+step.datePos+'px;">'+badge+step.displayDate+"</span>");
    });
    
    $(document).on('click','.dateWidget',function() {
        var stepIndex = parseInt($(this).attr("id").replace( /^\D+/g, ''));
        if(steps[stepIndex] !== undefined) {
            goToStep(stepIndex); 
        }
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
    $("#camera .items, #senato .items").empty();
    $("#proposta .data, #approvazione .data").html("");
    $("#progressBarWidget").attr("aria-valuenow", 0).css("width", "0%");
    $(".commissioni").css({opacity: 0 });
}

function maybeShowCenterArrow(ddl, stepIndex) {
    var id = ddl.numeroFase;
    if(steps[stepIndex].changedRamo && $("#arrow_"+id).length) {
        $("#arrow_"+id).fadeIn();    
    }
}

function setApproveValue(data) {
    var isApprovatoData = isApproved(data);
    if(isApprovatoData) {
        $("#approvazione").toggleClass("active");
        $("#approvazione .data").html(isApprovatoData);
        $("#bottomArrow line").fadeIn();
    } else {
        $("#approvazione").toggleClass("notApproved");
    }
    
    return "#approvazione";
}

function isApproved(data) {
    for(var i = 0; i<data.ddlList.length; i++) {
        if(data.ddlList[i].stato.match("approvato definitivamente")) {
            return data.ddlList[i].dataStato;
        }
    }
    return false;
}

function actionMiniStep(ddl, date, stepIndex) {
    var container = showDetails(ddl),
        legend = $(container+ " #"+date),
        parentId = $("#"+ddl.numeroFase).parents("fieldset").attr("id");
    legend.toggleClass("active");
    $("#"+ddl.numeroFase).addClass("active");
    $("#"+parentId+ " legend").addClass("active");
    maybeShowCenterArrow(ddl, stepIndex);
    return container+ " #"+date;
}

function deactivateMiniStep(ddl, date) {
    var container = "#commissioni"+ddl.ramo,
        parentId = $("#"+ddl.numeroFase).parents("fieldset").attr("id");
    $(container).css({opacity: 0 });
    $("#"+parentId+ " legend").removeClass("active");
}

function actionGroup(ddl, stepIndex, activate) {
    var id = ddl.numeroFase,
        parentId = $("#"+id).parents("fieldset").attr("id");
    
    if(activate) {
        maybeShowCenterArrow(ddl, stepIndex);
        $("#"+id).addClass("active");
        $("#"+parentId+ " legend").addClass("active");
    } else {
        $("#"+id).removeClass("active");
        $("#"+parentId+ " legend").removeClass("active");
    }
    
    return "#"+id;
}

function fillInitialData(data) {
    $("#proposta").toggleClass("active");
    $("#proposta .data").html(data.dataProposta+" "+data.nameProposta);
    $("#topArrow #top_arrow_"+data.sourceProposta).fadeIn();
    
    var camera = [],
        senato = [],
        sequence = [];
        
    $.each(data.ddlList, function(index, ddl) {
        var obj = {};
        obj.nameF = ddl.fase;
        obj.displayName = ddl.progressivoIter+". "+obj.nameF;
        obj.id = ddl.numeroFase;
        obj.ddlObj = ddl;

        if((ddl.ramo == "C")) {
            obj.container = "#camera";
            obj.type = "camera";
        } else {
            obj.container = "#senato";
            obj.type = "senato";
        }
        sequence.push(obj);   
    });
        
    for(var i = 0; i < sequence.length; i++) {
        var obj = sequence[i];
        $("#camera .items, #senato .items").append('<div></div>');
        addPropostaItem(obj.container+" .items>div:nth-child("+(i+1)+")", obj.displayName, obj.id, obj.ddlObj);
    }
    
    drawCenterArrows = $.proxy(drawCenterArrowsRaw, this, sequence);
    drawCenterArrows();
    return "#proposta";
}

function setCenterArrowBox() {
    var pos = $("#camera .itemClick:nth-child(1)").offset(),
        width = $("#camera .itemClick:nth-child(1)").width(),
        left = pos.left+width;
    $("#centerArrow").width($("#senato .itemClick:nth-child(1)").offset().left-left);
    $("#centerArrow").height($("#camera").height());
    $("#centerArrow").css({left: left, top: $("#camera").position().top});
    
    d3.selectAll("#centerArrow svg").attr("width", function() {
        return getParentSize(this).w;
    }).attr("height", function() {
        return getParentSize(this).h;
    });
}

function showDetails(ddl) {
	container = "#commissioni"+ddl.ramo;
	var elements = [];
	$(container).animate({ opacity: 1 });
	$(container+" .items").html("");

	$.each(ddl.assegnazioniSortedDates, function(index, date) {
	    var list = "";
        for(var i = 0; i < ddl.assegnazioni[date].length; i++) {
            var listItem = '<li>'+ddl.assegnazioni[date][i]+'</li>';
            if(list.indexOf(listItem) == -1) {
                list += listItem;
            }
        }
        $(container+" .items").append('<fieldset class="commissDate"><legend id="'+date+'">'+date+'</legend><ul>'+list+'</ul></fieldset>');
	});
	return container+" .items";
}

function addPropostaItem(container, name, id, ddl) {
	var item = '<button id="'+id+'" type="button" class="btn-circle itemClick">'+name+'</button>',
	    buttonSelector = container+" #"+id;
    
	$(container).append(item);
	$(buttonSelector).click(function() {
	    showDetails(ddl);
	});
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
        links = [{s:0,t:1, id: "top_arrow_C"}, {s:0,t:2, id: "top_arrow_S"}];

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
        boxPosition = $(selector).position(),
        padding = {
            topY: 5,
            topX: 20,
            bottomY: 15,
            bottomX: 20
        },
        nodes = [{
            x : (posCamera.left-boxPosition.left)+(cameraWidth/2),
            y : padding.topY
        },{
            x : (posSenato.left-boxPosition.left)+(cameraWidth/2),
            y : padding.topY
        }, {
            x : middle - padding.bottomX,
            y : height - padding.bottomY
        }, {
            x : middle+padding.bottomX,
            y : height - padding.bottomY
        }],
        links = [{s:0,t:2, id: "bottom_camera_arrow"}, {s:1,t:3, id: "bottom_senato_arrow"}];
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

function createSvgNodes(resize) {
    var hiddenArrows = $("line.arrow")
                        .filter(function(i, el) { return $(el).css("display") == "none";})
                        .map(function(i, el) { return "#"+$(el).attr("id");});
    d3.selectAll("#topArrow, #bottomArrow, #centerArrow").html("");
    d3.selectAll("#topArrow, #bottomArrow, #centerArrow").append("svg").attr("width", function() {
        return getParentSize(this).w;
    }).attr("height", function() {
        return getParentSize(this).h;
    });
    createTopArrows();
    createBottomArrows();
    if(!resize) {
        $("line.arrow").hide();    
    } else {
        $.each(hiddenArrows, function(index, el) {
            $(el).hide();
        });
    }
    return hiddenArrows;
}

function drawCenterArrowsRaw(data, hiddenArrows) {
    setCenterArrowBox();
    createCenterArrows(data);
    if(!hiddenArrows) {
        $("#centerArrow .arrow").hide();    
    } else {
        $.each(hiddenArrows, function(index, el) {
            if($(el).parents("#centerArrow").length != 0) {
                $(el).hide();    
            }
        });
    }
}

function moveToNextStep() {
    var node = null;
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
    
    $("#date_"+iterStatus.currentStep).toggleClass("activeColor");
    setProgressBarValue(iterStatus.currentStep);
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
    
    if(iterStatus.currentStep+1 >= steps.length) {
        finishMoving();
    } else {
        $("#nextStep").removeClass("disabled");
    }
}

function setProgressBarValue(stepIndex) {
    var step = steps[stepIndex];
    if(stepIndex+1 == steps.length) {
        $("#progressBarWidget").css("width", "100%");
    } else if(step && step.datePos) {
        var width  = step.datePos + ($("#"+step.dateId).width()/2);
        $("#progressBarWidget").css("width", width+"px");    
    }
}

function goToStep(step) {
    var diff = step - iterStatus.currentStep;
    if(diff > 0) {
        while(diff) {
            moveToNextStep();
            diff--;
        }
    } else {
        clearStatus();
        while(step>-1) {
            moveToNextStep();
            step--;
        }
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
    goToStep(iterStatus.currentStep-1);
}

function playOrPause() {
	if($("#playPause").is(".glyphicon-repeat")) {
		$("#playPause").removeClass("glyphicon-repeat");
		$("#playPause").addClass("glyphicon-pause");
		clearStatus();
		playInterval = setInterval(moveToNextStep, 1500);
	} else if($("#playPause").is(".glyphicon-pause")) {
		$("#playPause").removeClass("glyphicon-pause");
		$("#playPause").addClass("glyphicon-play");		clearInterval(playInterval);
	} else {
		$("#playPause").removeClass("glyphicon-play");
		$("#playPause").addClass("glyphicon-pause");
		moveToNextStep();
		playInterval = setInterval(moveToNextStep, 1500);
	}
}

function onWindowResize() {
    setElementsSize();
    var hiddenArrows = createSvgNodes(true);
    if($.isFunction(drawCenterArrows)) {
        drawCenterArrows(hiddenArrows);    
    }
}

function setElementsSize() {
    var containerWidth = $("#cameraSenato").width(),
        commissioniWidth = $(".commissioni").outerWidth(true)*$(".commissioni").length;
    $("#middle").width(containerWidth-commissioniWidth-25);
}

function initIter(data) {
	$("#selectData").hide();
	$("#iterVisualization").show();
	$(".commissioni").css({opacity: 0 });
    $("#nextStep").click(moveToNextStep);
    $("#prevStep").click(moveToPrevStep);
    $("#playPause").click(playOrPause);
    
    setElementsSize();
	createSvgNodes();
	init(data);
	
	$( window ).resize(onWindowResize);
}

jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + 
                                                $(window).scrollTop()) + "px");
    this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) + 
                                                $(window).scrollLeft()) + "px");
    return this;
}

function normalizeCommissioni(commissioni, ddl) {
	for(var date in ddl.assegnazioni) {
		$.each(ddl.assegnazioni[date], function(index, commissioneIndex) {
			ddl.assegnazioni[date][index] = commissioni[commissioneIndex];
		});
	}
	return ddl;
}

function prepareData(name, data) {
	var idDdl = data.ddl.filter(function(a) {return a.fase == name;}).map(function(a) {return a.idddl;})[0],
		ddlGroup = [];
	
	if(idDdl) {
		ddlGroup = data.ddl.filter(function(a) {return a.idddl == idDdl;});
		ddlGroup = ddlGroup.map($.proxy(normalizeCommissioni, this, data.commissioni));
		if(ddlGroup.length) {
			initIter(ddlGroup);
		}
	}
}

function initSelectionData() {
	var dataUrl = "json/dataset.json";
	
	$.getJSON(dataUrl, function(data) {
		var dataset = [], table;

		$.each(data.ddl, function(index, ddl) {
			dataset.push([ddl.fase, ddl.titolo, ddl.dataStato]);
		});

		$('#selectData').html( '<h3>Seleziona un elemento per visualizzare il procedimento legislativo</h3><table cellpadding="0" cellspacing="0" border="0" class="table table-striped table-bordered" id="selectTable"></table>' );
 
		table = $('#selectTable').dataTable( {
			"data": dataset,
			"language": {
                "url": "json/dataTables.italian.json"
            },
			"bLengthChange": false,
			"iDisplayLength": 15	,
			"columns": [
				{ "title": "Numero" },
				{ "title": "Titolo" },
				{ "title": "Data" }
			],
			"order": [[ 2, "desc" ]],
			"aoColumnDefs": [
			  { "sWidth": "80px", "aTargets": [ 2 ] }
			],
			"fnInitComplete": function(oSettings, json) {
				$(".loader").fadeOut();
				$("#selectData").fadeIn();
			},
			"fnDrawCallback": function(){
				  $('#selectTable td').bind('mouseenter', function () { $(this).parent().children().each(function(){$(this).addClass('highlight');}); });
				  $('#selectTable td').bind('mouseleave', function () { $(this).parent().children().each(function(){$(this).removeClass('highlight');}); });
			}
		} );
		
		$('#selectTable tbody').on( 'click', 'tr', function () {
			prepareData(table.fnGetData(this)[0], data);
		});
	});
}

$(function() {
	$("#iterVisualization").hide();
	$("#selectData").hide();
	$(".loader").center();
	initSelectionData();
});
