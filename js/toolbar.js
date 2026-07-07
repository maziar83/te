const Toolbar = (function() {
    let initialized = false;
    let api = {};

    function init(deps) {
        if (initialized) return;
        initialized = true;
        api = deps;

        // ابزارها
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.addEventListener('click', function() {
                const tool = this.dataset.tool;
                document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
                if (api.annotation.getTool() === tool) {
                    api.annotation.setTool(null);
                } else {
                    this.classList.add('active');
                    api.annotation.setTool(tool);
                }
                document.getElementById('pdfViewport').style.cursor =
                    (api.annotation.getTool() === 'text') ? 'text' :
                    (api.annotation.getTool() === 'pencil') ? 'crosshair' :
                    (api.annotation.getTool() === 'highlight') ? 'crosshair' : 'default';
            });
        });

        // رنگ
        document.querySelectorAll('.color-swatch').forEach(el => {
            el.addEventListener('click', function() {
                api.annotation.setColor(this.dataset.color);
            });
        });

        // ضخامت
        document.querySelectorAll('.thickness-option').forEach(el => {
            el.addEventListener('click', function() {
                api.annotation.setThickness(parseInt(this.dataset.size));
            });
        });

        // صفحه‌بندی
        document.getElementById('prevPage').addEventListener('click', api.prevPage);
        document.getElementById('nextPage').addEventListener('click', api.nextPage);
        document.getElementById('pageInput').addEventListener('change', function() {
            const val = parseInt(this.value);
            if (val > 0) api.goToPage(val);
        });

        // زوم
        document.getElementById('zoomIn').addEventListener('click', api.zoomIn);
        document.getElementById('zoomOut').addEventListener('click', api.zoomOut);
        document.getElementById('fitWidth').addEventListener('click', api.fitWidth);
        document.getElementById('fitPage').addEventListener('click', api.fitPage);

        // جستجو
        const searchToggle = document.getElementById('searchToggle');
        const searchBar = document.getElementById('searchBar');
        searchToggle.addEventListener('click', () => {
            searchBar.style.display = searchBar.style.display === 'none' ? 'flex' : 'none';
            if (searchBar.style.display === 'flex') document.getElementById('searchInput').focus();
        });
        document.getElementById('searchClose').addEventListener('click', () => {
            searchBar.style.display = 'none';
        });
        document.getElementById('searchInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') api.search.performSearch(this.value);
        });
        document.getElementById('searchPrev').addEventListener('click', () => api.search.navigateSearch(-1));
        document.getElementById('searchNext').addEventListener('click', () => api.search.navigateSearch(1));

        // بند انگشتی
        const thumbToggle = document.getElementById('thumbnailsToggle');
        const thumbSidebar = document.getElementById('thumbnailsSidebar');
        thumbToggle.addEventListener('click', () => thumbSidebar.classList.toggle('collapsed'));
        document.getElementById('thumbnailsClose').addEventListener('click', () => thumbSidebar.classList.add('collapsed'));
    }

    return { init };
})();