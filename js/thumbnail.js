const Thumbnail = (function() {
    let pdfDoc = null;
    let goToPageFn = null;
    const list = document.getElementById('thumbnailsList');
    const THUMB_SCALE = 0.3;

    function init(doc, id, goToPage) {
        pdfDoc = doc;
        goToPageFn = goToPage;
        render();
    }

    async function render() {
        if (!pdfDoc) return;
        list.innerHTML = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: THUMB_SCALE });
            const wrapper = document.createElement('div');
            wrapper.className = 'thumbnail-item';
            wrapper.dataset.page = i;

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            wrapper.appendChild(canvas);
            const label = document.createElement('div');
            label.className = 'page-label';
            label.textContent = `صفحه ${i}`;
            wrapper.appendChild(label);

            wrapper.addEventListener('click', () => goToPageFn(i));
            list.appendChild(wrapper);
        }
        updateActive(1);
    }

    function updateActive(pageNum) {
        document.querySelectorAll('.thumbnail-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.page) === pageNum);
        });
        const active = document.querySelector('.thumbnail-item.active');
        if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function destroy() {
        list.innerHTML = '';
        pdfDoc = null;
    }

    return { init, updateActive, destroy };
})();