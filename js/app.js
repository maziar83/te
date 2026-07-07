document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('fileGrid');
    const files = CONFIG.PDF_FILES;

    if (!files || files.length === 0) {
        grid.innerHTML = '<div class="loading-files">هیچ فایل PDF یافت نشد.</div>';
        return;
    }

    let html = '';
    files.forEach(file => {
        html += `
            <div class="file-card" data-filename="${file.filename}">
                <div class="pdf-icon">📄</div>
                <div class="file-title">${file.title}</div>
            </div>
        `;
    });
    grid.innerHTML = html;

    document.querySelectorAll('.file-card').forEach(card => {
        card.addEventListener('click', function() {
            const filename = this.dataset.filename;
            window.location.href = `reader.html?file=${encodeURIComponent(filename)}`;
        });
    });
});