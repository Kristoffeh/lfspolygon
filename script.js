mouseX = 0;
mouseY = 0;

// move circle
drag = false;
activeCircle = null;
window.layers = {};
layersSize = 0;

$(function () {
    canvasDiv = document.getElementById("canvas");
    window.gr = new jxGraphics(canvasDiv);
    gr.getSVG().style.opacity = 0.5;

    // Modal close handlers
    $(window).on('click', function(event) {
        // Export modal
        var exportModal = $('#exportModal');
        if (event.target === exportModal[0]) {
            closeExportModal();
        }
        
        // Layer name modal
        var layerNameModal = $('#layerNameModal');
        if (event.target === layerNameModal[0]) {
            closeLayerNameModal();
        }
        
        // Delete confirm modal
        var deleteModal = $('#deleteConfirmModal');
        if (event.target === deleteModal[0]) {
            closeDeleteConfirmModal();
        }
    });
    
    // Enter key support for layer name input
    $('#layerNameInput').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            confirmLayerName();
        }
    });

    $(document).on('mousemove', '#canvas', function (e) {
        getMouseXY(e);

        if (drag) {
            if (activeCircle) {
                activeCircle.center = new jxPoint(mouseX, mouseY);
                activeCircle.draw(gr);
                reDrawPolygon();
            }
        }
    });

    $(document).on('mouseup', '#canvas', function () {

        if (getEditType() == 'add') {
            createCirlce(true);
        }

        if (getEditType() == 'delete') {
            if (activeCircle) {
                var layer = getLayer();

                if (typeof layer == 'string' && layer.length > 0) {
                    var tmpCircles = [];
                    for (var j in layers[layer].circles) {
                        if (activeCircle.id != layers[layer].circles[j].id) {
                            tmpCircles.push(layers[layer].circles[j]);
                        }
                        else {
                            layers[layer].circles[j].remove();
                        }
                    }
                    layers[layer].circles = tmpCircles;
                    if (tmpCircles.length < 3)
                        layers[layer].polygon.hide()

                }
            }
        }

        drag = false;
        activeCircle = null;
        reDrawPolygon();
    });

    //---------------------------------------------------

    var color_picker = document.getElementById("color-picker");
    var color_picker_wrapper = document.getElementById("color-picker-wrapper");
    color_picker.onchange = function () {
        color_picker_wrapper.style.backgroundColor = color_picker.value;
        reDrawPolygon();
    };
    color_picker_wrapper.style.backgroundColor = color_picker.value;


    $(document).on('change', '#layer', function (e) {
        var elem = this;
        for (i in layers) {
            if (layers.hasOwnProperty(i)) {
                $('#name').val(layers[i].name);
                $('#speed').val(layers[i].speedLimit);
                for (j in layers[i].circles) {
                    if (i == elem.value)
                        layers[i].circles[j].show();
                    else
                        layers[i].circles[j].hide();
                }
            }
        }
    });

    $(document).on('change', '#name', function (e) {
        var layer = getLayer();

        if (typeof layer != 'string' || layer.length == 0)
            return;

        layers[layer].name = this.value;
    });

    $(document).on('change', '#speed', function (e) {
        var layer = getLayer();

        if (typeof layer != 'string' || layer.length == 0)
            return;

        layers[layer].speedLimit = this.value;
    });
})
//Get canvas center point
function getCanvasCenter() {
    var width = canvasDiv.offsetWidth || parseInt(canvasDiv.style.width) || 2560;
    var height = canvasDiv.offsetHeight || parseInt(canvasDiv.style.height) || 2560;
    return { x: width / 2, y: height / 2 };
}

//Get mouse position
function getMouseXY(e) {
    var pageX, pageY;

    if (document.all) //For IE
    {
        pageX = event.clientX + document.body.parentElement.scrollLeft;
        pageY = event.clientY + document.body.parentElement.scrollTop;
    }
    else {
        pageX = e.pageX;
        pageY = e.pageY;
    }

    // Calculate position relative to canvas
    var canvasRect = canvasDiv.getBoundingClientRect();
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    mouseX = pageX - canvasRect.left - scrollLeft + canvasDiv.scrollLeft;
    mouseY = pageY - canvasRect.top - scrollTop + canvasDiv.scrollTop;

    if (mouseX < 0) {
        mouseX = 0
    }
    if (mouseY < 0) {
        mouseY = 0
    }

    var center = getCanvasCenter();
    $('.mouse_helper').css({
        left: (pageX + 15) + 'px',
        top: (pageY + 15) + 'px'
    }).text('X: ' + (mouseX - center.x) + ' Y: ' + (center.y - mouseY));

    return true;
}

function getColor() {
    var color = null;

    if (document.getElementById("color-picker").value != "") {
        color = new jxColor(document.getElementById("color-picker").value);
    }
    else {
        color = new jxColor("blue");
    }
    return color
}

function getPen() {
    // return new jxPen(getColor(), '1px');;
    return new jxPen(new jxColor("black"), '1px');
    ;
}

function getBrush() {
    return new jxBrush(getColor())
}

function createCirlce(show) {
    var layer = getLayer();

    if (typeof layer != 'string' || layer.length == 0)
        return;

    var cir = new jxCircle(new jxPoint(mouseX, mouseY), 5, getPen(), getBrush());
    cir.id = layer + '_' + layers[layer].circles.length;

    if (show)
        cir.draw(gr);

    cir.addEventListener('mousedown', circleMouseDown);
    cir.addEventListener('mouseup', circleMouseUp);
    cir.addEventListener('mouseover', circleMouseOver);
    cir.addEventListener('mouseout', circleMouseOut);
    layers[layer].circles.push(cir);
    return cir;
}

//Mousedown event handler for circle
function circleMouseDown(evt, obj) {

    if (getEditType() == 'move') {
        drag = true;
    }

    if (getEditType() != 'add') {
        activeCircle = obj;
    }

}

//Mouseup event handler for circle
function circleMouseUp(evt, obj) {
    //activeCircle = null;
}

function circleMouseOver(evt, obj) {

    document.body.style.cursor = "pointer";

    obj.brush = new jxBrush(new jxColor("red"));
    obj.draw(gr);

}

function circleMouseOut(evt, obj) {

    document.body.style.cursor = "inherit";

    obj.brush = new jxBrush(getColor());
    obj.draw(gr);

}

function reDrawPolygon() {

    var layer = getLayer();

    if (typeof layer != 'string' || layer.length == 0)
        return;


    if (layers[layer].circles.length < 3)
        return;

    if (typeof layers[layer].polygon == 'undefined')
        layers[layer].polygon = new jxPolygon([], getPen(), getBrush())

    var points = [];

    for (var j in layers[layer].circles) {
        layers[layer].circles[j].brush = getBrush();
        points.push(layers[layer].circles[j].center)
    }

    layers[layer].polygon.points = points;
    layers[layer].polygon.brush = getBrush();
    layers[layer].polygon.draw(gr);

}


function track(track) {
    var img = new Image();
    img.onload = function() {
        canvasDiv.style.width = this.width + 'px';
        canvasDiv.style.height = this.height + 'px';
        canvasDiv.style.backgroundImage = "url(tracks/" + track + ".jpg)";
        
        // Resize the SVG element to match the canvas
        var svg = gr.getSVG();
        if (svg) {
            svg.style.width = this.width + 'px';
            svg.style.height = this.height + 'px';
            svg.setAttribute('width', this.width);
            svg.setAttribute('height', this.height);
        }
    };
    img.src = "tracks/" + track + ".jpg";
    return false;
}



var layerModalMode = 'add'; // 'add' or 'edit'
var layerModalCallback = null;

function addLayer(inpName) {
    if(typeof inpName != 'undefined') {
        // Direct call with name (from loadJson)
        createLayerWithName(inpName);
        return;
    }
    
    // Show modal for user input
    layerModalMode = 'add';
    $('#layerNameModalTitle').text('Add Layer');
    $('#layerNameInput').val('');
    $('#layerNameError').hide();
    $('#layerNameModal').css('display', 'block');
    $('#layerNameInput').focus();
}

function createLayerWithName(name) {
    if (name.length <= 0) {
        return undefined;
    }

    layersSize++;

    var op = document.createElement('option');
    op.selected = true;
    op.value = layersSize;
    op.innerHTML = name;

    layers[layersSize] = {};
    layers[layersSize].circles = [];
    layers[layersSize].speedLimit = 0;
    layers[layersSize].name = name;

    $('#layer').append(op);
    $('#layer').trigger('change');
    
    return layersSize;
}

function editLayer() {
    var layer = getLayer();
    
    if (typeof layer != 'string' || layer.length == 0) {
        // Show error in a simple alert since modal isn't open yet
        alert('Please select a layer to edit');
        return;
    }

    layerModalMode = 'edit';
    layerModalCallback = layer;
    var currentName = layers[layer].name;
    
    $('#layerNameModalTitle').text('Edit Layer');
    $('#layerNameInput').val(currentName);
    $('#layerNameError').hide();
    $('#layerNameModal').css('display', 'block');
    $('#layerNameInput').focus();
    $('#layerNameInput').select();
}

function deleteLayer() {
    var layer = getLayer();
    
    if (typeof layer != 'string' || layer.length == 0) {
        // Show error in a simple alert since modal isn't open yet
        alert('Please select a layer to delete');
        return;
    }

    layerModalCallback = layer;
    $('#deleteConfirmModal').css('display', 'block');
}

function confirmDeleteLayer() {
    var layer = layerModalCallback;
    
    if (!layer) {
        closeDeleteConfirmModal();
        return;
    }

    // Remove all circles and polygon from this layer
    if (layers[layer]) {
        for (var j in layers[layer].circles) {
            layers[layer].circles[j].remove();
        }
        
        if (typeof layers[layer].polygon != 'undefined') {
            layers[layer].polygon.remove();
        }
    }

    // Remove from layers object
    delete layers[layer];

    // Remove from select dropdown
    var select = document.getElementById('layer');
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value == layer) {
            select.remove(i);
            break;
        }
    }

    // Clear name and speed fields if layer was selected
    if (select.value == layer || select.options.length == 0) {
        $('#name').val('');
        $('#speed').val('');
    }
    
    // Select first layer if available
    if (select.options.length > 0) {
        select.selectedIndex = 0;
        $('#layer').trigger('change');
    }
    
    closeDeleteConfirmModal();
}

function confirmLayerName() {
    var name = $('#layerNameInput').val().trim();
    
    if (name.length <= 0) {
        showLayerError('Layer name cannot be empty');
        return;
    }
    
    if (layerModalMode === 'add') {
        createLayerWithName(name);
        closeLayerNameModal();
    } else if (layerModalMode === 'edit') {
        var layer = layerModalCallback;
        if (!layer) {
            closeLayerNameModal();
            return;
        }
        
        // Update layer name
        layers[layer].name = name;
        
        // Update the option text in the select
        var select = document.getElementById('layer');
        for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value == layer) {
                select.options[i].innerHTML = name;
                break;
            }
        }
        
        // Update the name input field if this layer is currently selected
        if (select.value == layer) {
            $('#name').val(name);
        }
        
        closeLayerNameModal();
    }
}

function closeLayerNameModal() {
    $('#layerNameModal').css('display', 'none');
    $('#layerNameInput').val('');
    $('#layerNameError').hide();
    layerModalCallback = null;
}

function closeDeleteConfirmModal() {
    $('#deleteConfirmModal').css('display', 'none');
    layerModalCallback = null;
}

function showLayerError(message) {
    $('#layerNameError').text(message).show();
}

function getLayer() {
    return $('#layer').val();
}

function clearCanvas() {
    for (i in layers) {
        if (layers.hasOwnProperty(i)) {
            for (j in layers[i].circles) {
                layers[i].circles[j].remove();
            }

            layers[i].polygon.remove();
        }
    }

    layers = {};

    $('#layer').html('');
    layersSize = 0;
}

function Export() {
    var data = [];
    var center = getCanvasCenter();

    for (i in layers) {
        if (layers.hasOwnProperty(i)) {
            var row = {};
            row.name = layers[i].name;
            row.speedLimit = layers[i].speedLimit;
            row.X = [];
            row.Y = [];
            for (j in layers[i].circles) {
                row.X.push(layers[i].circles[j].center.x - center.x);
                row.Y.push(center.y - layers[i].circles[j].center.y);
            }
            data.push(row);
        }
    }

    var jsonData = JSON.stringify(data, null, 4);
    $('#txt').val(jsonData);
    $('#exportData').val(jsonData);
    $('#exportModal').css('display', 'block');
}

function closeExportModal() {
    $('#exportModal').css('display', 'none');
}

function copyExportData() {
    var copyText = document.getElementById("exportData");
    copyText.select();
    copyText.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand("copy");
    alert("Copied to clipboard!");
}

function getEditType() {
    return document.getElementById('type').value;
}

function loadJson(){

    var conf = JSON.parse($('#txt').val())

    if(typeof conf == 'undefined')
        return;

    clearCanvas();

    var center = getCanvasCenter();

    for(i in conf)
    {
        var street = conf[i];

        document.getElementById("color-picker").value = getRandomColor();

        addLayer(street.name);
        layers[getLayer()].speedLimit = street.speedLimit;

        for(j in street['X']) {
            mouseX = center.x + street['X'][j];
            mouseY = center.y - street['Y'][j];
            createCirlce(true);
        }
        reDrawPolygon();
    }
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
