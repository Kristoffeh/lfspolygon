mouseX = 0;
mouseY = 0;

// move circle
drag = false;
activeCircle = null;
window.layers = {};
layersSize = 0;

// Zoom
var canvasZoom = 1;
var canvasOffsetX = 0;
var canvasOffsetY = 0;

// Panning
var isPanning = false;
var panStartX = 0;
var panStartY = 0;
var panStartOffsetX = 0;
var panStartOffsetY = 0;

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
        
        // Alert modal
        var alertModal = $('#alertModal');
        if (event.target === alertModal[0]) {
            closeAlertModal();
        }
        
        // Properties modal
        var propertiesModal = $('#propertiesModal');
        if (event.target === propertiesModal[0]) {
            closePropertiesModal();
        }
        
        // Import modal
        var importModal = $('#importModal');
        if (event.target === importModal[0]) {
            closeImportModal();
        }
        
        // Wipe layers modal
        var wipeLayersModal = $('#wipeLayersModal');
        if (event.target === wipeLayersModal[0]) {
            closeWipeLayersModal();
        }
        
        // Clear canvas modal
        var clearCanvasModal = $('#clearCanvasModal');
        if (event.target === clearCanvasModal[0]) {
            closeClearCanvasModal();
        }
        
        // Wipe layers modal
        var wipeLayersModal = $('#wipeLayersModal');
        if (event.target === wipeLayersModal[0]) {
            closeWipeLayersModal();
        }
    });
    
    // Enter key support for layer name input
    $('#layerNameInput').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            confirmLayerName();
        }
    });

    // Keyboard shortcuts for edit modes
    $(document).on('keydown', function(e) {
        // Don't trigger shortcuts when typing in input fields or textareas
        var target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        var key = e.key.toLowerCase();
        var typeSelect = document.getElementById('type');
        
        if (key === 'a') {
            // Add mode
            typeSelect.value = 'add';
            $(typeSelect).trigger('change');
            e.preventDefault();
        } else if (key === 's') {
            // Move mode
            typeSelect.value = 'move';
            $(typeSelect).trigger('change');
            e.preventDefault();
        } else if (key === 'd') {
            // Delete mode
            typeSelect.value = 'delete';
            $(typeSelect).trigger('change');
            e.preventDefault();
        } else if (key === 'e') {
            // None mode (pan)
            typeSelect.value = 'none';
            $(typeSelect).trigger('change');
            e.preventDefault();
        }
    });

    // Canvas zoom with scroll (Photoshop-style: zooms towards mouse cursor)
    $(document).on('wheel', '#canvas', function(e) {
        // Always prevent default scrolling on canvas
        e.preventDefault();
        e.stopPropagation();
        
        var delta = e.originalEvent.deltaY;
        var zoomFactor = delta > 0 ? 0.9 : 1.1;
        var newZoom = Math.max(0.1, Math.min(5, canvasZoom * zoomFactor));
        
        // Get mouse position in screen/viewport coordinates
        var mouseX = e.originalEvent.clientX;
        var mouseY = e.originalEvent.clientY;
        
        // Get the canvas element's base position (before transform)
        // We need to account for the canvas's left offset (320px for sidebar)
        var canvasBaseLeft = 320; // From CSS: left: 320px
        var canvasBaseTop = 0;
        
        // Calculate mouse position relative to canvas base position
        var mouseRelativeX = mouseX - canvasBaseLeft;
        var mouseRelativeY = mouseY - canvasBaseTop;
        
        // Calculate the point in the original (untransformed) canvas content
        // that is currently under the mouse cursor
        // Formula: contentPoint = (screenPoint - offset) / zoom
        var contentX = (mouseRelativeX - canvasOffsetX) / canvasZoom;
        var contentY = (mouseRelativeY - canvasOffsetY) / canvasZoom;
        
        // Update zoom level
        canvasZoom = newZoom;
        
        // Calculate new offset to keep the same content point under the mouse
        // Formula: offset = screenPoint - (contentPoint * zoom)
        canvasOffsetX = mouseRelativeX - (contentX * canvasZoom);
        canvasOffsetY = mouseRelativeY - (contentY * canvasZoom);
        
        // Apply transform
        canvasDiv.style.transform = 'translate(' + canvasOffsetX + 'px, ' + canvasOffsetY + 'px) scale(' + canvasZoom + ')';
        canvasDiv.style.transformOrigin = '0 0';
    });

    // Update cursor based on edit mode
    $(document).on('mouseenter', '#canvas', function() {
        if (getEditType() == 'none') {
            canvasDiv.style.cursor = 'grab';
        } else {
            canvasDiv.style.cursor = 'default';
        }
    });

    $(document).on('mousedown', '#canvas', function (e) {
        // Handle panning when in "none" mode
        if (getEditType() == 'none' && e.which == 1) { // Left mouse button
            isPanning = true;
            panStartX = e.pageX;
            panStartY = e.pageY;
            panStartOffsetX = canvasOffsetX;
            panStartOffsetY = canvasOffsetY;
            canvasDiv.style.cursor = 'grabbing';
            e.preventDefault();
            return false;
        }
    });

    $(document).on('mousemove', '#canvas', function (e) {
        // Handle panning
        if (isPanning) {
            var deltaX = e.pageX - panStartX;
            var deltaY = e.pageY - panStartY;
            canvasOffsetX = panStartOffsetX + deltaX;
            canvasOffsetY = panStartOffsetY + deltaY;
            
            // Apply transform
            canvasDiv.style.transform = 'translate(' + canvasOffsetX + 'px, ' + canvasOffsetY + 'px) scale(' + canvasZoom + ')';
            canvasDiv.style.transformOrigin = '0 0';
            return;
        }

        getMouseXY(e);

        if (drag) {
            if (activeCircle) {
                activeCircle.center = new jxPoint(mouseX, mouseY);
                activeCircle.draw(gr);
                reDrawPolygon();
            }
        }
    });

    $(document).on('mouseup', '#canvas', function (e) {
        // Stop panning
        if (isPanning) {
            isPanning = false;
            canvasDiv.style.cursor = 'default';
            return;
        }

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
    var color_display = document.getElementById("color-display");
    
    function updateColorDisplay() {
        var color = color_picker.value;
        color_picker_wrapper.style.backgroundColor = color;
        if (color_display) {
            color_display.textContent = color.toUpperCase();
        }
    }
    
    color_picker.onchange = function () {
        updateColorDisplay();
        reDrawPolygon();
    };
    
    updateColorDisplay();


    $(document).on('change', '#layer', function (e) {
        var elem = this;
        for (i in layers) {
            if (layers.hasOwnProperty(i)) {
                for (j in layers[i].circles) {
                    if (i == elem.value)
                        layers[i].circles[j].show();
                    else
                        layers[i].circles[j].hide();
                }
            }
        }
    });

    // Update cursor and indicators when edit mode changes
    function updateEditModeIndicators() {
        var mode = getEditType();
        var modeNames = {
            'add': 'Add',
            'move': 'Move',
            'delete': 'Delete',
            'none': 'Pan'
        };
        
        // Update sidebar indicator
        var indicator = $('#editModeIndicator');
        indicator.text(modeNames[mode] || mode);
        indicator.removeClass('mode-add mode-move mode-delete mode-none');
        indicator.addClass('mode-' + mode);
        
        // Update top-right badge
        var badge = $('#editModeBadge');
        badge.text(modeNames[mode] || mode);
        badge.removeClass('mode-add mode-move mode-delete mode-none');
        badge.addClass('mode-' + mode);
        
        // Update cursor
        if (mode == 'none') {
            canvasDiv.style.cursor = 'grab';
        } else {
            canvasDiv.style.cursor = 'default';
        }
    }
    
    $(document).on('change', '#type', function() {
        updateEditModeIndicators();
    });
    
    // Initialize indicators on page load
    updateEditModeIndicators();

    // Stop panning if mouse is released outside canvas
    $(document).on('mouseup', function() {
        if (isPanning) {
            isPanning = false;
            if (getEditType() == 'none') {
                canvasDiv.style.cursor = 'grab';
            } else {
                canvasDiv.style.cursor = 'default';
            }
        }
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
    // Get mouse position in viewport coordinates (same as zoom function)
    var mouseScreenX, mouseScreenY;
    
    if (document.all) //For IE
    {
        mouseScreenX = event.clientX;
        mouseScreenY = event.clientY;
    }
    else {
        mouseScreenX = e.clientX || e.originalEvent.clientX;
        mouseScreenY = e.clientY || e.originalEvent.clientY;
    }

    // Get the canvas element's base position (before transform)
    // Same calculation as in zoom function
    var canvasBaseLeft = 320; // From CSS: left: 320px
    var canvasBaseTop = 0;
    
    // Calculate mouse position relative to canvas base position
    var mouseRelativeX = mouseScreenX - canvasBaseLeft;
    var mouseRelativeY = mouseScreenY - canvasBaseTop;
    
    // Convert to canvas content coordinates (accounting for zoom and offset)
    // Same formula as zoom function: contentPoint = (screenPoint - offset) / zoom
    mouseX = (mouseRelativeX - canvasOffsetX) / canvasZoom;
    mouseY = (mouseRelativeY - canvasOffsetY) / canvasZoom;

    if (mouseX < 0) {
        mouseX = 0
    }
    if (mouseY < 0) {
        mouseY = 0
    }

    var center = getCanvasCenter();
    var coordX = (mouseX - center.x).toFixed(2);
    var coordY = (center.y - mouseY).toFixed(2);
    $('.mouse_helper').text('x: ' + coordX + ' y: ' + coordY);

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
    // Don't handle circle events if panning
    if (getEditType() == 'none') {
        return;
    }

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
        showAlert('Please select a layer to edit');
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
        showAlert('Please select a layer to delete');
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

function showAlert(message, title) {
    title = title || 'Information';
    $('#alertModalTitle').text(title);
    $('#alertModalMessage').text(message);
    $('#alertModal').css('display', 'block');
}

function closeAlertModal() {
    $('#alertModal').css('display', 'none');
}

function getLayer() {
    return $('#layer').val();
}

function openPropertiesModal() {
    var layer = getLayer();
    
    if (typeof layer != 'string' || layer.length == 0) {
        showAlert('Please select a layer to edit properties');
        return;
    }

    // Load current properties
    $('#propertiesName').val(layers[layer].name || '');
    $('#propertiesSpeed').val(layers[layer].speedLimit || '');
    $('#propertiesError').hide();
    
    // Store current layer for saving
    window.currentPropertiesLayer = layer;
    
    $('#propertiesModal').css('display', 'block');
    $('#propertiesName').focus();
}

function closePropertiesModal() {
    $('#propertiesModal').css('display', 'none');
    $('#propertiesName').val('');
    $('#propertiesSpeed').val('');
    $('#propertiesError').hide();
    window.currentPropertiesLayer = null;
}

function saveProperties() {
    var layer = window.currentPropertiesLayer;
    
    if (!layer || typeof layer != 'string' || layer.length == 0) {
        $('#propertiesError').text('No layer selected').show();
        return;
    }

    var name = $('#propertiesName').val().trim();
    var speed = $('#propertiesSpeed').val().trim();

    if (name.length <= 0) {
        $('#propertiesError').text('Layer name cannot be empty').show();
        return;
    }

    // Update layer properties
    layers[layer].name = name;
    layers[layer].speedLimit = speed;

    // Update the option text in the select dropdown
    var select = document.getElementById('layer');
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value == layer) {
            select.options[i].innerHTML = name;
            break;
        }
    }

    closePropertiesModal();
}

function confirmClearCanvas() {
    $('#clearCanvasModal').css('display', 'block');
}

function closeClearCanvasModal() {
    $('#clearCanvasModal').css('display', 'none');
}

function clearCanvasConfirm() {
    clearCanvas();
    closeClearCanvasModal();
}

function confirmWipeLayers() {
    $('#wipeLayersModal').css('display', 'block');
}

function closeWipeLayersModal() {
    $('#wipeLayersModal').css('display', 'none');
}

function confirmClearCanvas() {
    $('#clearCanvasModal').css('display', 'block');
}

function closeClearCanvasModal() {
    $('#clearCanvasModal').css('display', 'none');
}

function clearCanvasConfirm() {
    clearCanvas();
    closeClearCanvasModal();
}

function confirmWipeLayers() {
    $('#wipeLayersModal').css('display', 'block');
}

function closeWipeLayersModal() {
    $('#wipeLayersModal').css('display', 'none');
}

function wipeLayers() {
    clearCanvas();
    closeWipeLayersModal();
}

function clearCanvas() {
    // Remove all shapes from all layers
    for (var i in window.layers) {
        if (window.layers.hasOwnProperty(i)) {
            // Remove all circles
            if (window.layers[i].circles) {
                for (var j in window.layers[i].circles) {
                    try {
                        window.layers[i].circles[j].remove();
                    } catch (e) {
                        // Continue if removal fails
                    }
                }
            }

            // Remove polygon if it exists
            if (window.layers[i].polygon) {
                try {
                    window.layers[i].polygon.remove();
                } catch (e) {
                    // Continue if removal fails
                }
            }
        }
    }

    // Clear all layers
    window.layers = {};
    layers = {};

    // Clear the layer dropdown
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
            row.speedLimit = parseInt(layers[i].speedLimit) || 0;
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

function openImportModal() {
    $('#importData').val('');
    $('#importError').hide();
    $('#importModal').css('display', 'block');
    $('#importData').focus();
}

function closeImportModal() {
    $('#importModal').css('display', 'none');
    $('#importData').val('');
    $('#importError').hide();
}

function importJson() {
    var jsonText = $('#importData').val().trim();
    
    if (jsonText.length === 0) {
        $('#importError').text('Please paste JSON data').show();
        return;
    }

    try {
        var conf = JSON.parse(jsonText);
        
        if (typeof conf == 'undefined' || !Array.isArray(conf)) {
            $('#importError').text('Invalid JSON format. Expected an array.').show();
            return;
        }

        clearCanvas();

        var center = getCanvasCenter();

        for(i in conf)
        {
            var street = conf[i];

            if (!street.name || !street.X || !street.Y) {
                $('#importError').text('Invalid data structure. Missing required fields (name, X, Y).').show();
                clearCanvas();
                return;
            }

            document.getElementById("color-picker").value = getRandomColor();

            addLayer(street.name);
            layers[getLayer()].speedLimit = street.speedLimit || 0;

            for(j in street['X']) {
                mouseX = center.x + street['X'][j];
                mouseY = center.y - street['Y'][j];
                createCirlce(true);
            }
            reDrawPolygon();
        }
        
        closeImportModal();
    } catch (e) {
        $('#importError').text('Invalid JSON: ' + e.message).show();
    }
}

// Keep loadJson for backwards compatibility (uses hidden textarea)
function loadJson(){
    var jsonText = $('#txt').val();
    if (jsonText) {
        $('#importData').val(jsonText);
        openImportModal();
    } else {
        openImportModal();
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
