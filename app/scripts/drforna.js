import d3 from 'd3';
import {FornaContainer} from 'fornac';

import '../styles/treemap.css';
import '../styles/drforna.css';

function doStepwiseAnimation(elementName, structs, duration) {
    var container = new FornaContainer(elementName, {'applyForce': false,
                                       'allowPanningAndZooming': true,
                                       'labelInterval':0,
                                       'initialSize': null,
                                       'transitionDuration': duration });

                                       var funcs = []

                                       for (i = 0; i < structs.length; i++) {
                                           if (funcs.length === 0)
                                               (function(val) { funcs.push(function() { container.transitionRNA(structs[val]); container.setOutlineColor('white');
                                               })} )(i);
                                               else
                                                   (function(val, prevFunc) { funcs.push(function() { container.transitionRNA(structs[val], prevFunc); container.setOutlineColor('white');
                                                   })} )(i, funcs[funcs.length-1] );
                                       }

                                       funcs[funcs.length-1]();
}

export function cotranscriptionalTimeSeriesLayout() {
    var options = {'applyForce': false, 
        'allowPanningAndZooming': true,
        'labelInterval':0,
        'resizeSvgOnResize': false,    //don't trigger a reflow and keep things speedy
        'transitionDuration': 0}

    var margin = {top: 10, right: 60, bottom: 40, left: 50};
    var totalWidth = 700;
    var totalHeight = 400;

    var treemapWidth = totalWidth - margin.left - margin.right;
    var treemapHeight = totalHeight * 0.85 - margin.top - margin.bottom;

    var lineChartWidth = totalWidth - margin.left - margin.right;
    var lineChartHeight = totalHeight - treemapHeight - margin.top - margin.bottom;

    var lineX = d3.scale.linear().range([0, lineChartWidth]);
    var lineY = d3.scale.linear().range([lineChartHeight, 0]);
    var line;

    var color = d3.scale.category20();
    var newTimePointCallback = null;
    var newTimeClickCallback = null;

    var treemap, wholeDiv, treemapDiv, labelSvg, labelDiv;
    var lineChartDiv, outlineDiv, svg, currentTime = 0; 

    function chart(selection) {
        selection.each(function(data) {
            console.log('treemapWidth:', treemapWidth);

            treemap = d3.layout.treemap()
            .size([treemapWidth, treemapHeight])
            .sticky(false)
            .value(function(d) { return d.size; });

            wholeDiv = d3.select(this).append('div')
            .style('position', 'relative')
            .attr('id', 'whole-div');

            treemapDiv = wholeDiv.append('div')
            .classed('treemap-div', true)
            .style('position', 'absolute')
            .style('left', margin.left + 'px')
            .style('top', margin.top + 'px');


            labelDiv = wholeDiv.append('div')
            .style('position', 'absolute')
            .style('top', margin.top + 'px')

            labelSvg = labelDiv
            .append('svg')

            /*
            labelSvg.append('text')
            .attr('transform', `translate(${margin.left - 30}, 150)rotate(-90)`)
            .text('Structures')
            */

            lineChartDiv = wholeDiv.append('div')
            .style('position', 'absolute')
            .style('left', 0 + 'px')


            outlineDiv = wholeDiv.append('div')
            .classed('outline-div', true)
            .style('position', 'absolute')
            .style('left', margin.left + 'px')
            .style('top', margin.top + 'px');

            svg = lineChartDiv.append('svg')
            .attr('width', lineChartWidth)
            .attr('height', lineChartHeight)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            line = d3.svg.line()
            .interpolate('basis')
            .x(function(d) { return lineX(+d.time); })
            .y(function(d) { return lineY(+d.conc); });


            function divName(d) {
                return 'div' + d.name;
            }

            var bisectTime = d3.bisector(function(d) { return d.time; }).left;

            function drawCotranscriptionalLine() {
                data.forEach(function(d) {
                    d.time = +d.time;
                    d.conc = +d.conc;
                    //d.full_id = d.id + '-' + d.struct.length;
                    //console.log('d.full_id', d.full_id);
                });

                color.domain(d3.set(data.map(function(d) { return d.id })).values());

                lineX.domain(d3.extent(data, function(d) { return +d.time; }));
                lineY.domain(d3.extent(data, function(d) { return +d.conc; }));

                var xAxis = d3.svg.axis()
                .scale(lineX)
                .orient('bottom');

                var yAxis = d3.svg.axis()
                .scale(lineY)
                .orient('left')
                .ticks(0);

                var _xCoord = 0;
                var runAnimation = false;

                svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + lineChartHeight + ')')
                .call(xAxis);

                svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + (0) + ',0)')
                .call(yAxis)
                .append('text')
                .attr('x', lineChartWidth /2)
                .attr('y', lineChartHeight + 25)
                .attr('dy', '.71em')
                .style('text-anchor', 'middle')
                .text('Time (Seconds)');

                svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + (0) + ',0)')
                .call(yAxis)
                .append('text')
                .attr('transform', 'translate(-30,0)rotate(-90)')
                .style('text-anchor', 'end')
                .text('Population');

                svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + (0) + ',0)')
                .call(yAxis)
                .append('text')
                .attr('transform', 'translate(-15,0)rotate(-90)')
                .style('text-anchor', 'end')
                .text('Density (%)');
                
                var currentTimeIndicatorLine = svg.append('line')
                .attr('x1', currentTime)
                .attr('y1', 0)
                .attr('x2', currentTime)
                .attr('y2', lineChartHeight)
                .classed('time-indicator', true);

                var nestedData = d3.nest().key(function(d) { return +d.id; }).entries(data)
                var concProfile = svg.selectAll('.concProfile')
                .data(nestedData)
                .enter().append('g')
                .attr('class', 'concProfile');

                function createInitialRoot(nestedData) {
                    var root = {'name': 'graph',
                        'children': nestedData.map(function(d) { return {'name': d.key, 'struct': 
                                                   d.values[0].struct, 'size': 1 / nestedData.length};})};
                        return root;

                }

                var root = createInitialRoot(nestedData);
                let populatedValues = [];
                var containers = {};

                var node = treemapDiv.datum(root).selectAll('.treemapNode')
                .data(treemap.nodes)
                .enter().append('div')
                .attr('class', 'treemapNode')
                .attr('id', divName)
                .call(position)
                //.style('background', function(d) { return d.children ? color(d.name) : null; })
                //.text(function(d) { return d.children ? null : d.name; })
                .each(function(d) { 
                    if (typeof d.struct != 'undefined') {
                        containers[divName(d)] = new FornaContainer('#' + divName(d), options);
                        containers[divName(d)].transitionRNA(d.struct);
                        containers[divName(d)].setOutlineColor(color(d.name));
                    }
                } );

                concProfile.append('path')
                .attr('class', 'line')
                .attr('d', function(d) { return line(d.values); })
                .style('stroke', function(d) { 
                    return color(d.key); 
                });

                svg.append('rect')
                .attr('class', 'overlay')
                .attr('width', lineChartWidth)
                .attr('height', lineChartHeight)
                .on('mouseover', function() { })
                .on('mousemove', mousemove)
                .on('click', mouseclick);

                wholeDiv
                .on('mouseenter', function() {
                    runAnimation = false;
                })
                .on('mouseleave', function() { 
                    runAnimation = true;

                    updateCurrentTime(_xCoord);
                    /*
                       console.log('mouseleave');

                       var xy = d3.mouse(this);

                       if (xy[0] > treemapWidth + lineChartWidth) {
                       var root = createInitialRoot(nestedData);
                       updateTreemap(root);
                       }
                       */
                })

                function updateTreemap(root) {
                    var node = treemapDiv.datum(root).selectAll('.treemapNode')
                    .data(treemap.nodes)
                    .call(position)
                    .each(function(d) { 
                        if (typeof d.struct != 'undefined') {
                            var cont = containers[divName(d)];
                            cont.setSize();

                            cont.setOutlineColor(color(d.name));
                        }
                    });
                }

                function updateCurrentTime(xCoord) {
                    //saveSvgAsPng(document.getElementById('whole-div'), 'rnax.png', 4);

                    var y0 = lineX.invert(xCoord);

                    let i = bisectTime(data, y0, 1);
                    var values = nestedData.map(function(data) { 
                        var i = bisectTime(data.values, y0, 0)

                        if (i >= data.values.length || i == 0)
                            return {'name': data.key, 'struct': data.values[0].struct, 'size': 0};

                        var d0 = data.values[i-1];
                        var d1 = data.values[i];

                        var sc = d3.scale.linear()
                        .domain([data.values[i-1].time, data.values[i].time])
                        .range([data.values[i-1].conc, data.values[i].conc])

                        var value = sc(y0);

                        var retVal= {'name': data.key, 'struct': data.values[0].struct, 'size': +value};
                        containers[divName(retVal)].transitionRNA(data.values[i].struct)
                        return retVal;
                    });

                    populatedValues = values.filter(d => { return d.size > 0; });

                    if (newTimePointCallback != null)
                        newTimePointCallback(populatedValues);

                    var root = {'name': 'graph',
                        'children': values };

                        updateTreemap(root);

                        currentTimeIndicatorLine.attr('x1', xCoord)
                        .attr('x2', xCoord);

                        if (runAnimation) {
                            _xCoord += lineChartWidth / 100;
                            //setTimeout(function() { updateCurrentTime(_xCoord); }, 300);
                        }

                }

                function mousemove() {
                    _xCoord = (d3.mouse(this)[0]);

                    updateCurrentTime(_xCoord);
                }

                function mouseclick() {
                    if (newTimeClickCallback != null)
                        newTimeClickCallback(populatedValues);
                }
            };


            drawCotranscriptionalLine();

            function position() {
              this.style('left', function(d) {  return d.x + 'px'; })
                  .style('top', function(d) { return d.y + 'px'; })
                  .style('width', function(d) { return Math.max(0, d.dx - 0) + 'px'; })
                  .style('height', function(d) { return Math.max(0, d.dy - 0) + 'px'; })
            }
        });

        updateDimensions();
    }

    var updateDimensions = function() {
        treemapWidth = totalWidth - margin.left - margin.right;
        treemapHeight = totalHeight * 0.85 - margin.top - margin.bottom;

        console.log('treemapWidth:', treemapWidth);

        lineChartWidth = totalWidth - margin.left - margin.right;
        lineChartHeight = totalHeight - treemapHeight - margin.top - margin.bottom;

        lineX = d3.scale.linear().range([0, lineChartWidth]);
        lineY = d3.scale.linear().range([lineChartHeight, 0]);

        wholeDiv
        .style('width', (treemapWidth + margin.left + margin.right) + 'px')
        .style('height', (treemapHeight + lineChartHeight + margin.top + margin.bottom) + 'px')

        treemapDiv
            .style('width', (treemapWidth) + 'px')
            .style('height', (treemapHeight) + 'px')

        labelDiv
            .style('width', margin.left + 'px')
            .style('height', treemapHeight)

        labelSvg
            .attr('width', margin.left + 'px')
            .attr('height', treemapHeight);

        lineChartDiv
            .style('width', (lineChartWidth + margin.right) + 'px')
            .style('height', (lineChartHeight + margin.bottom + margin.top) + 'px')
            .style('top', treemapHeight + 'px');

        outlineDiv
            .style('width', (treemapWidth) + 'px')
            .style('height', (treemapHeight) + 'px')

    }

    chart.width = function(_) {
        if (!arguments.length) return totalWidth;
        else totalWidth = _;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) return totalHeight;
        else totalHeight = _;
        return chart;
    };

    chart.newTimePointCallback = function(_) {
        if (!arguments.length) return options.newTimePointCallback;
        else newTimePointCallback = _;
        return chart;
    }

    chart.newTimeClickCallback = function(_) {
        if (!arguments.length) return options.newTimeClickCallback;
        else newTimeClickCallback = _;
        return chart;
    }

    return chart;
}

export function cotranscriptionalSmallMultiplesLayout() {
    // set all of the parameters
    var padding = [10,10];
    var treemapWidth = 160;
    var treemapHeight = 160;
    var svgWidth = 550;
    var svgHeight = 0;
    var textHeight = 15;

    function getOrCreateSequence(cotranscriptionalState) {
        // extract the sequence from a line of coTranscriptional output
        // and if it doesn't exist (which it shouldn't), just return
        // a string of As
        var letters;
        if ('seq' in cotranscriptionalState)
            return cotranscriptionalState['seq']
        else {
            letters = '';
            for (var i = 0; i < cotranscriptionalState['struct'].length; i++)
                letters = letters + 'A';
        }

        return letters;
    };

    var chart = function(selection) {
        selection.each(function(data) {

            var nestedData = d3.nest().key(function(d) { return d.time; }).entries(data);
            nestedData.sort(function(a,b) { return (+a.key) - (+b.key); });

            var inputData = nestedData.map(function(x) {
                return { 
                    'children': x.values.map(function(y) {
                        return { 
                            'structure': y.struct,
                            'sequence': getOrCreateSequence(y),
                            'size': y.conc,
                            'time': y.time
                        };
                    })
                }});


            // calculate the number of columns and the height of the SVG,
            // which is dependent on the on the number of data points
            var numCols = Math.floor((svgWidth + padding[0]) / (treemapWidth + padding[0]));
            var svgHeight = Math.ceil(inputData.length / numCols) * (treemapHeight + padding[1]) - padding[1];

            // the rna treemap layout, which will be called for every grid point
            var rnaTreemap = rnaTreemapChart()
            .width(treemapWidth)
            .height(treemapHeight - textHeight)

            // the grid layout that will determine the position of each
            // treemap
            var rectGrid = d3.layout.grid()
            .bands()
            .size([svgWidth, svgHeight])
            .cols(numCols)
            .padding(padding)
            .nodeSize([treemapWidth, treemapHeight]);
            var rectData = rectGrid(inputData)
                .map(function(d) { 
                    d.pos = { x: d.x, y: d.y }
                    return d;
                });

            // create an svg as a child of the #rna_ss div
            // and then a g for each grid cell
            var svg = d3.select(this)
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)

            svg.selectAll('.rna-treemap')
            .data(rectData)
            .enter()
            .append('g')
            .attr('transform', function(d) { 
                return 'translate(' + d.x + ',' + d.y + ')'; })
            .classed('rna-treemap', true)
            .call(rnaTreemap);

            svg.selectAll('.time-g')
            .data(rectData)
            .enter()
            .append('g')
            .attr('transform', function(d) { 
                return 'translate(' + d.pos.x + ',' + d.pos.y + ')'; })
            .classed('time-g', true)
            .append('text')
            .attr('x', treemapWidth / 2)
            .attr('y', treemapHeight - textHeight + 16)
            .classed('time-label', true)
            .text(function(d) { 
                  return 'time: ' + d.children[0].time
            });
        });
    };

    chart.width = function(_) {
        if (!arguments.length) return svgWidth;
        else svgWidth = _;
        return chart;
    }

    chart.height = function(_) {
        if (!arguments.length) return svgHeight;
        return chart;
    }


    return chart;
}

