document.addEventListener("click", function (e) {
    const btn = e.target.closest(".btn-duyet");
    if (!btn) return;

    // Hiệu ứng click
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        btn.style.transform = '';
    }, 150);

    const id = btn.dataset.id;

    // Hiển thị loading khi duyệt
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang duyệt...';
    btn.disabled = true;

    fetch("/Admin/AdminSuscesWord/DuyetAjax", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]')?.value || ""
        },
        body: JSON.stringify({ id: parseInt(id) })
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                btn.innerHTML = '<i class="fas fa-check me-1"></i> Đã duyệt';
                btn.className = 'btn btn-sm btn-outline-success';

                // Reload lại danh sách sau 1 giây
                setTimeout(() => {
                    if (typeof loadDanhSach === "function") {
                        loadDanhSach(currentPage);
                    }
                }, 1000);
            } else {
                btn.innerHTML = 'Duyệt';
                btn.disabled = false;
                alert("Lỗi: " + res.message);
            }
        })
        .catch(() => {
            btn.innerHTML = 'Duyệt';
            btn.disabled = false;
            alert("Lỗi kết nối server!");
        });
});
