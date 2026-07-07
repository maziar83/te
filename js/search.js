const Search = (function() {
    let pdfDoc = null;
    let fileId = '';
    let goToPageFn = null;
    let results = [];
    let currentIndex = -1;

    function init(doc, id, goToPage) {
        pdfDoc = doc;
        fileId = id;
        goToPageFn = goToPage;
    }

    async function performSearch(query) {
        clearHighlights();
        if (!query || query.trim() === '') {
            document.getElementById('searchCount').textContent = '0 / 0';
            return;
        }
        results = [];
        currentIndex = -1;
        const q = query.trim().toLowerCase().normalize('NFKC');

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ').toLowerCase().normalize('NFKC');
            let idx = text.indexOf(q);
            while (idx !== -1) {
                results.push({ page: i, index: idx });
                idx = text.indexOf(q, idx + 1);
            }
        }

        document.getElementById('searchCount').textContent =
            results.length > 0 ? `1 / ${results.length}` : '0 / 0';

        if (results.length > 0) {
            currentIndex = 0;
            goToPageFn(results[0].page);
            setTimeout(() => highlightCurrent(), 300);
        }
    }

    function highlightCurrent() {
        if (currentIndex >= 0 && currentIndex < results.length) {
            document.getElementById('statusInfo').textContent =
                `نتیجه ${currentIndex+1} از ${results.length} در صفحه ${results[currentIndex].page}`;
            document.getElementById('searchCount').textContent =
                `${currentIndex+1} / ${results.length}`;
        }
    }

    function navigateSearch(delta) {
        if (results.length === 0) return;
        currentIndex = (currentIndex + delta + results.length) % results.length;
        goToPageFn(results[currentIndex].page);
        setTimeout(() => highlightCurrent(), 300);
    }

    function clearHighlights() {
        document.getElementById('searchCount').textContent = '0 / 0';
        document.getElementById('statusInfo').textContent = 'آماده';
        results = [];
        currentIndex = -1;
    }

    function destroy() {
        pdfDoc = null;
        clearHighlights();
    }

    return { init, performSearch, navigateSearch, clearHighlights, destroy };
})();
