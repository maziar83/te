const Reader = (function() {
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let scale = 1.0;
    let fileId = '';
    let filename = '';
    let isRendering = false;
    const viewport = document.getElementById('pdfViewport');
    const container = document.getElementById('pdfContainer');
    const statusInfo = document.getElementById('statusInfo');
    const initialMessage = document.getElementById('initialMessage');

    let annotation = null;
    let search = null;
    let thumbnail = null;

    async function renderPage(num) {
        if (!pdfDoc || isRendering) return;
        isRendering = true;
        try {
            const page = await pdfDoc.getPage(num);
            const viewportObj = page.getViewport({ scale });
            viewport.innerHTML = '';

            const wrapper = document.createElement('div');
            wrapper.className = 'page-wrapper';
            wrapper.dataset.page = num;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewportObj.width;
            canvas.height = viewportObj.height;
            canvas.style.width = viewportObj.width + 'px';
            canvas.style.height = viewportObj.height + 'px';

            wrapper.appendChild(canvas);
            viewport.appendChild(wrapper);

            await page.render({ canvasContext: ctx, viewport: viewportObj }).promise;

            const layer = document.createElement('div');
            layer.className = 'annotation-layer';
            layer.dataset.page = num;
            layer.style.width = viewportObj.width + 'px';
            layer.style.height = viewportObj.height + 'px';
            wrapper.appendChild(layer);

            if (annotation) {
                annotation.loadAnnotations(fileId, num, layer, viewportObj.width, viewportObj.height);
                annotation.attachLayer(layer);
            }

            document.getElementById('pageInput').value = num;
            document.getElementById('totalPages').textContent = totalPages;

            if (thumbnail) thumbnail.updateActive(num);
            if (search) search.clearHighlights();

            currentPage = num;
            isRendering = false;
        } catch (err) {
            console.error('Render error:', err);
            statusInfo.textContent = 'خطا در رندر صفحه: ' + err.message;
            isRendering = false;
            viewport.innerHTML = `<div class="error-message"><h3>❌ خطا در رندر</h3><p>${err.message}</p></div>`;
        }
    }

    function goToPage(num) {
        if (!pdfDoc) return;
        num = Math.min(Math.max(num, 1), totalPages);
        if (num === currentPage && viewport.children.length > 0) return;
        renderPage(num);
    }

    function nextPage() { goToPage(currentPage + 1); }
    function prevPage() { goToPage(currentPage - 1); }

    function setScale(newScale) {
        scale = Math.min(Math.max(newScale, 0.25), 3.0);
        document.getElementById('zoomLevel').textContent = Math.round(scale * 100) + '%';
        if (pdfDoc) renderPage(currentPage);
    }

    function zoomIn() { setScale(scale + 0.1); }
    function zoomOut() { setScale(scale - 0.1); }

    function fitWidth() {
        if (!pdfDoc) return;
        const cw = container.clientWidth - 40;
        pdfDoc.getPage(currentPage).then(p => {
            const v = p.getViewport({ scale: 1 });
            setScale(Math.min(cw / v.width, 2.0));
        }).catch(err => statusInfo.textContent = 'خطا در fitWidth: ' + err.message);
    }

    function fitPage() {
        if (!pdfDoc) return;
        const cw = container.clientWidth - 40;
        const ch = container.clientHeight - 40;
        pdfDoc.getPage(currentPage).then(p => {
            const v = p.getViewport({ scale: 1 });
            const sx = cw / v.width;
            const sy = ch / v.height;
            setScale(Math.min(sx, sy, 1.5));
        }).catch(err => statusInfo.textContent = 'خطا در fitPage: ' + err.message);
    }

    async function loadPDF(fileParam) {
        filename = fileParam;
        fileId = filename.replace('.pdf', '');
        const url = `file/${filename}`;
        statusInfo.textContent = 'در حال بارگذاری...';
        if (initialMessage) initialMessage.textContent = 'در حال بارگذاری...';

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`فایل ${filename} یافت نشد (کد ${response.status})`);
            }

            const task = pdfjsLib.getDocument(url);
            pdfDoc = await task.promise;
            totalPages = pdfDoc.numPages;
            document.getElementById('totalPages').textContent = totalPages;
            document.getElementById('pageInput').max = totalPages;
            document.getElementById('fileNameDisplay').textContent = filename;

            annotation = Annotation;
            annotation.init(fileId);

            search = Search;
            search.init(pdfDoc, fileId, goToPage);

            thumbnail = Thumbnail;
            thumbnail.init(pdfDoc, fileId, goToPage);

            Toolbar.init({
                prevPage, nextPage, goToPage,
                zoomIn, zoomOut, fitWidth, fitPage,
                setScale,
                annotation,
                search,
                thumbnail
            });

            await renderPage(1);
            statusInfo.textContent = `بارگذاری شد: ${filename}`;
        } catch (err) {
            console.error('Load error:', err);
            statusInfo.textContent = `❌ خطا: ${err.message}`;
            viewport.innerHTML = `
                <div class="error-message">
                    <h3>❌ خطا در بارگذاری فایل</h3>
                    <p>${err.message}</p>
                    <p style="font-size:14px;color:#666;margin-top:12px;">
                        مطمئن شوید فایل در پوشه <strong>file/</strong> وجود دارد و نام آن صحیح است.
                    </p>
                    <p style="font-size:14px;color:#666;">
                        همچنین از یک سرور محلی (مثل Live Server) استفاده کنید.
                    </p>
                </div>
            `;
        }
    }

    function destroy() {
        pdfDoc = null;
        viewport.innerHTML = '';
        if (annotation) annotation.destroy();
        if (search) search.destroy();
        if (thumbnail) thumbnail.destroy();
    }

    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    if (file) {
        loadPDF(file);
    } else {
        statusInfo.textContent = 'فایلی انتخاب نشده است.';
        viewport.innerHTML = `
            <div class="error-message" style="color:#666;">
                <h3>📄 هیچ فایلی انتخاب نشده</h3>
                <p>لطفاً از کتابخانه یک فایل انتخاب کنید.</p>
            </div>
        `;
    }

    return {
        goToPage, nextPage, prevPage,
        setScale, zoomIn, zoomOut, fitWidth, fitPage,
        getCurrentPage: () => currentPage,
        getTotalPages: () => totalPages,
        getScale: () => scale,
        destroy
    };
})();
