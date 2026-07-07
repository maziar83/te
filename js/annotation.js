const Annotation = (function() {
    let currentFileId = '';
    let activeTool = null;
    let currentColor = CONFIG.DEFAULT_COLOR;
    let currentThickness = CONFIG.DEFAULT_THICKNESS;
    let isDrawing = false;
    let drawPoints = [];
    let activeLayer = null;
    let annotationData = {};

    function loadFromStorage() {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) try { annotationData = JSON.parse(stored); } catch(e) { annotationData = {}; }
        if (!annotationData[currentFileId]) annotationData[currentFileId] = {};
    }

    function saveToStorage() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(annotationData));
    }

    function getPageAnnotations(pageNum) {
        return annotationData[currentFileId]?.[pageNum] || [];
    }

    function setPageAnnotations(pageNum, anns) {
        if (!annotationData[currentFileId]) annotationData[currentFileId] = {};
        annotationData[currentFileId][pageNum] = anns;
        saveToStorage();
    }

    function loadAnnotations(fileId, pageNum, layer, width, height) {
        if (fileId !== currentFileId) return;
        const anns = getPageAnnotations(pageNum);
        anns.forEach(ann => {
            if (ann.type === 'highlight') {
                const el = document.createElement('div');
                el.className = 'hl-item';
                el.style.left = ann.x + 'px';
                el.style.top = ann.y + 'px';
                el.style.width = ann.w + 'px';
                el.style.height = ann.h + 'px';
                el.style.backgroundColor = ann.color || currentColor;
                layer.appendChild(el);
            } else if (ann.type === 'pencil') {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.classList.add('pencil-item');
                svg.style.width = width + 'px';
                svg.style.height = height + 'px';
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', ann.path);
                path.setAttribute('stroke', ann.color || '#000');
                path.setAttribute('stroke-width', ann.thickness || 4);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                svg.appendChild(path);
                layer.appendChild(svg);
            } else if (ann.type === 'text') {
                const note = document.createElement('div');
                note.className = 'text-note';
                note.style.left = ann.x + 'px';
                note.style.top = ann.y + 'px';
                note.dataset.noteId = ann.id || Date.now() + '_' + Math.random();
                const textSpan = document.createElement('span');
                textSpan.textContent = ann.text || 'یادداشت';
                note.appendChild(textSpan);
                const del = document.createElement('span');
                del.className = 'note-delete';
                del.textContent = '×';
                del.addEventListener('click', (e) => {
                    e.stopPropagation();
                    note.remove();
                    removeTextNote(pageNum, ann.id || note.dataset.noteId);
                });
                note.appendChild(del);
                makeDraggable(note, pageNum);
                layer.appendChild(note);
            }
        });
    }

    function removeTextNote(pageNum, noteId) {
        let anns = getPageAnnotations(pageNum);
        anns = anns.filter(a => !(a.type === 'text' && a.id === noteId));
        setPageAnnotations(pageNum, anns);
        updateStatus();
    }

    function makeDraggable(el, pageNum) {
        let offsetX, offsetY;
        el.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('note-delete')) return;
            const rect = el.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            const onMove = (ev) => {
                const containerRect = el.parentElement.getBoundingClientRect();
                let x = ev.clientX - containerRect.left - offsetX;
                let y = ev.clientY - containerRect.top - offsetY;
                x = Math.max(0, Math.min(x, containerRect.width - el.offsetWidth));
                y = Math.max(0, Math.min(y, containerRect.height - el.offsetHeight));
                el.style.left = x + 'px';
                el.style.top = y + 'px';
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                const left = parseFloat(el.style.left);
                const top = parseFloat(el.style.top);
                const anns = getPageAnnotations(pageNum);
                const noteId = el.dataset.noteId;
                const found = anns.find(a => a.type === 'text' && a.id === noteId);
                if (found) { found.x = left; found.y = top; setPageAnnotations(pageNum, anns); }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    function addHighlight(pageNum, x, y, w, h, color) {
        const anns = getPageAnnotations(pageNum);
        anns.push({ type: 'highlight', x, y, w, h, color: color || currentColor });
        setPageAnnotations(pageNum, anns);
        updateStatus();
        if (typeof Reader !== 'undefined') Reader.goToPage(pageNum);
    }

    function addPencil(pageNum, pathData, color, thickness) {
        const anns = getPageAnnotations(pageNum);
        anns.push({ type: 'pencil', path: pathData, color: color || currentColor, thickness: thickness || currentThickness });
        setPageAnnotations(pageNum, anns);
        updateStatus();
        if (typeof Reader !== 'undefined') Reader.goToPage(pageNum);
    }

    function addTextNote(pageNum, x, y, text, color) {
        const anns = getPageAnnotations(pageNum);
        const id = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        anns.push({ type: 'text', id, x, y, text: text || 'یادداشت', color: color || currentColor });
        setPageAnnotations(pageNum, anns);
        updateStatus();
        if (typeof Reader !== 'undefined') Reader.goToPage(pageNum);
    }

    function attachLayer(layer) {
        activeLayer = layer;
        if (!layer) return;
        const newLayer = layer.cloneNode(true);
        layer.parentNode.replaceChild(newLayer, layer);
        activeLayer = newLayer;

        activeLayer.addEventListener('mousedown', onMouseDown);
        activeLayer.addEventListener('mousemove', onMouseMove);
        activeLayer.addEventListener('mouseup', onMouseUp);
        activeLayer.addEventListener('mouseleave', onMouseUp);
        activeLayer.addEventListener('dblclick', onDblClick);
    }

    let isHighlighting = false;
    let highlightStart = null;
    let highlightRect = null;

    function onMouseDown(e) {
        if (!activeTool || activeTool === 'text') return;
        const rect = activeLayer.getBoundingClientRect();
        if (activeTool === 'highlight') {
            isHighlighting = true;
            highlightStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            highlightRect = document.createElement('div');
            highlightRect.style.position = 'absolute';
            highlightRect.style.border = '1px dashed #0078d7';
            highlightRect.style.backgroundColor = 'rgba(0,120,215,0.1)';
            highlightRect.style.pointerEvents = 'none';
            highlightRect.style.left = highlightStart.x + 'px';
            highlightRect.style.top = highlightStart.y + 'px';
            highlightRect.style.width = '0px';
            highlightRect.style.height = '0px';
            activeLayer.appendChild(highlightRect);
        } else if (activeTool === 'pencil') {
            isDrawing = true;
            drawPoints = [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
        }
    }

    function onMouseMove(e) {
        if (activeTool === 'highlight' && isHighlighting && highlightStart && highlightRect) {
            const rect = activeLayer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const left = Math.min(highlightStart.x, x);
            const top = Math.min(highlightStart.y, y);
            highlightRect.style.left = left + 'px';
            highlightRect.style.top = top + 'px';
            highlightRect.style.width = Math.abs(x - highlightStart.x) + 'px';
            highlightRect.style.height = Math.abs(y - highlightStart.y) + 'px';
        } else if (activeTool === 'pencil' && isDrawing) {
            const rect = activeLayer.getBoundingClientRect();
            drawPoints.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            drawTempPencil();
        }
    }

    function onMouseUp(e) {
        if (activeTool === 'highlight' && isHighlighting) {
            isHighlighting = false;
            if (highlightStart && highlightRect) {
                const x = parseFloat(highlightRect.style.left) || 0;
                const y = parseFloat(highlightRect.style.top) || 0;
                const w = parseFloat(highlightRect.style.width) || 0;
                const h = parseFloat(highlightRect.style.height) || 0;
                if (w > 5 && h > 5) {
                    const pageNum = parseInt(activeLayer.dataset.page);
                    addHighlight(pageNum, x, y, w, h, currentColor);
                }
                highlightRect.remove();
                highlightRect = null;
                highlightStart = null;
            }
        } else if (activeTool === 'pencil' && isDrawing) {
            isDrawing = false;
            if (drawPoints.length > 1) {
                const pageNum = parseInt(activeLayer.dataset.page);
                const path = 'M' + drawPoints.map(p => p.x + ',' + p.y).join(' L');
                addPencil(pageNum, path, currentColor, currentThickness);
            }
            drawPoints = [];
            const temp = activeLayer.querySelector('.pencil-temp');
            if (temp) temp.remove();
        }
    }

    function drawTempPencil() {
        let temp = activeLayer.querySelector('.pencil-temp');
        if (!temp) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('pencil-temp');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke', currentColor);
            path.setAttribute('stroke-width', currentThickness);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            svg.appendChild(path);
            activeLayer.appendChild(svg);
            temp = svg;
        }
        const path = temp.querySelector('path');
        if (drawPoints.length > 1) {
            const d = 'M' + drawPoints.map(p => p.x + ',' + p.y).join(' L');
            path.setAttribute('d', d);
        }
    }

    function onDblClick(e) {
        if (activeTool !== 'text') return;
        const rect = activeLayer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const text = prompt('متن یادداشت:', 'یادداشت جدید');
        if (text !== null && text.trim() !== '') {
            const pageNum = parseInt(activeLayer.dataset.page);
            addTextNote(pageNum, x, y, text.trim(), currentColor);
        }
    }

    function setTool(tool) {
        activeTool = tool;
        if (activeLayer) {
            activeLayer.classList.toggle('active', !!tool);
        }
        updateStatus();
    }

    function setColor(color) {
        currentColor = color;
        document.querySelectorAll('.color-swatch').forEach(el => {
            el.classList.toggle('active', el.dataset.color === color);
        });
    }

    function setThickness(thickness) {
        currentThickness = thickness;
        document.querySelectorAll('.thickness-option').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.size) === thickness);
        });
    }

    function updateStatus() {
        const page = parseInt(activeLayer?.dataset?.page || 1);
        const anns = getPageAnnotations(page);
        const count = anns ? anns.length : 0;
        document.getElementById('statusAnnotation').textContent = count > 0 ? `${count} حاشیه‌نویسی` : 'بدون حاشیه‌نویسی';
    }

    function init(fileId) {
        currentFileId = fileId;
        loadFromStorage();
        setColor(CONFIG.DEFAULT_COLOR);
        setThickness(CONFIG.DEFAULT_THICKNESS);
        updateStatus();
    }

    function destroy() {
        if (activeLayer) {
            activeLayer.removeEventListener('mousedown', onMouseDown);
            activeLayer.removeEventListener('mousemove', onMouseMove);
            activeLayer.removeEventListener('mouseup', onMouseUp);
            activeLayer.removeEventListener('mouseleave', onMouseUp);
            activeLayer.removeEventListener('dblclick', onDblClick);
        }
        activeLayer = null;
    }

    return {
        init, destroy,
        setTool, setColor, setThickness,
        getColor: () => currentColor,
        getThickness: () => currentThickness,
        getTool: () => activeTool,
        attachLayer,
        loadAnnotations,
        addHighlight, addPencil, addTextNote,
        getPageAnnotations,
        updateStatus
    };
})();