document.addEventListener("DOMContentLoaded", function () {
    // Bắt sự kiện click nút chi tiết
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".btn-detail");
        if (!btn) return;

        const id = btn.dataset.id;

        // Gọi API lấy chi tiết tài khoản
        fetch(`/Admin/Account/GetDetail?id=${id}`)
            .then(r => r.json())
            .then(res => {
                if (!res.success) {
                    showToast(res.message, "error");
                    return;
                }

                // Đổ dữ liệu vào modal
                document.getElementById("detailId").textContent = res.TaiKhoan_id;
                document.getElementById("detailUsername").textContent = res.Username ?? "";
                document.getElementById("detailEmail").textContent = res.Email ?? "";
                document.getElementById("detailRole").textContent = res.RoleName ?? "Chưa có vai trò";

                // Mở modal
                const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("detailModal"));
                modal.show();
            })
            .catch(() => {
                showToast("Không thể tải chi tiết tài khoản!", "error");
            });
    });
});
