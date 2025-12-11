document.addEventListener("DOMContentLoaded", function () {
    const resetPasswordModal = document.getElementById("resetPasswordModal");
    const confirmResetBtn = document.getElementById("confirmResetBtn");
    let resetId = null;

    /* ==========================
       MỞ MODAL ĐẶT LẠI MẬT KHẨU
       ========================== */
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".btn-reset");
        if (!btn) return;

        resetId = btn.dataset.id;

        // Lấy thêm thông tin từ row để hiển thị trong modal
        const row = btn.closest("tr");
        const username = row ? row.children[1]?.textContent.trim() : "-";
        const email = row ? row.children[2]?.textContent.trim() : "-";
        const role = row ? row.children[3]?.textContent.trim() : "-";

        document.getElementById("resetCurrentUsername").textContent = username;
        document.getElementById("resetCurrentEmail").textContent = email;
        document.getElementById("resetCurrentRole").textContent = role;

        const modal = bootstrap.Modal.getOrCreateInstance(resetPasswordModal);
        modal.show();
    });

    /* ==========================
       XÁC NHẬN ĐẶT LẠI MẬT KHẨU
       ========================== */
    confirmResetBtn.addEventListener("click", function () {
        if (!resetId) return;

        fetch("/Admin/Account/ResetPasswordAjax", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
            },
            body: JSON.stringify({ id: resetId })
        })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    showToast(res.message, "success");
                    bootstrap.Modal.getInstance(resetPasswordModal).hide();
                } else {
                    showToast(res.message, "error");
                }
            })
            .catch(() => showToast("Lỗi kết nối đến server!", "error"));
    });
});
