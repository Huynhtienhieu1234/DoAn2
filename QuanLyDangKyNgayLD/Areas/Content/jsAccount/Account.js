document.addEventListener("DOMContentLoaded", function () {
    const btnAdd = document.getElementById("btnAdd");
    const createModal = document.getElementById("createModal");
    const form = document.getElementById("createForm");
    const roleSelect = document.getElementById("createRole");
    const passwordGroup = document.querySelector(".password-group");
    const passwordInput = document.getElementById("createPassword");
    const passwordHint = document.querySelector(".password-hint");
    const usernameInput = document.getElementById("createUsername");
    const toggleBtn = document.querySelector(".toggle-password");

    /* ==========================
       CHỈ CHO NHẬP SỐ (MSSV)
       ========================== */
    function restrictToDigits(e) {
        e.target.value = e.target.value.replace(/\D/g, "");
    }

    /* ==========================
       ẨN / HIỆN MẬT KHẨU THEO VAI TRÒ
       ========================== */
    function togglePasswordField() {
        const role = roleSelect.value;
        if (role === "3" || role === "4") {
            passwordGroup.style.display = "none";
            passwordInput.value = "";
            passwordHint.style.display = "block";
            if (toggleBtn) toggleBtn.style.display = "none";
            usernameInput.addEventListener("input", restrictToDigits);
        } else {
            passwordGroup.style.display = "block";
            passwordHint.style.display = "none";
            if (toggleBtn) toggleBtn.style.display = "block";
            usernameInput.removeEventListener("input", restrictToDigits);
        }
    }

    /* ==========================
       MỞ MODAL TẠO TÀI KHOẢN
       ========================== */
    if (btnAdd && createModal) {
        btnAdd.addEventListener("click", function () {
            form.reset();
            togglePasswordField();

            passwordInput.type = "password";
            const icon = toggleBtn ? toggleBtn.querySelector("i") : null;
            if (icon) {
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }

            document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
            document.body.classList.remove("modal-open");
            document.body.style = "";

            const toastContainer = document.querySelector(".toast-container");
            if (toastContainer) toastContainer.innerHTML = "";

            const modal = bootstrap.Modal.getOrCreateInstance(createModal);
            modal.show();
        });
    }

    if (roleSelect) roleSelect.addEventListener("change", togglePasswordField);

    /* ==========================
       NÚT CON MẮT HIỆN/ẨN MẬT KHẨU
       ========================== */
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener("click", function () {
            const icon = toggleBtn.querySelector("i");
            if (!icon) return;
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                passwordInput.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        });
    }

    /* ==========================
       SUBMIT FORM (AJAX)
       ========================== */
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            const role = roleSelect.value;
            const data = {
                Username: usernameInput.value.trim(),
                Email: document.getElementById("createEmail").value.trim(),
                VaiTro_id: role,
                Password: (role === "3" || role === "4") ? "" : passwordInput.value.trim()
            };

            fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
                },
                body: JSON.stringify(data)
            })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        showToast(res.message, "success");
                        bootstrap.Modal.getInstance(createModal).hide();
                        loadAccounts(1); // load lại trang đầu
                    } else {
                        showToast(res.message, "error");
                    }
                })
                .catch(() => showToast("Lỗi kết nối đến server!", "error"));
        });
    }

    /* ==========================
       LOAD DỮ LIỆU BẢNG + PHÂN TRANG
       ========================== */
    let currentPage = 1;
    const pageSize = 10;
    let totalPages = 1;

    function loadAccounts(page = 1) {
        const loading = document.getElementById("loadingIndicator");
        const tableBody = document.getElementById("accountTableBody");
        const pageNumbers = document.getElementById("pageNumbers");
        const prevBtn = document.getElementById("prev");
        const nextBtn = document.getElementById("next");

        if (loading) loading.style.display = "block";
        animateTable();

        fetch(`/Admin/Account/GetAccounts?page=${page}&pageSize=${pageSize}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data;
                currentPage = res.currentPage;
                totalPages = res.totalPages || 1;
                tableBody.innerHTML = "";

                if (data.length === 0) {
                    tableBody.innerHTML = `
                        <tr class="no-data-row">
                            <td colspan="6" class="text-muted py-4">Không có dữ liệu</td>
                        </tr>`;
                    pageNumbers.innerHTML = "";
                    prevBtn.disabled = true;
                    nextBtn.disabled = true;
                    updatePrevNextButtons(prevBtn, nextBtn);
                    return;
                }

                data.forEach((acc, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="stt-cell">${(currentPage - 1) * pageSize + index + 1}</td>
                        <td>${acc.Username}</td>
                        <td class="text-truncate" style="max-width:200px;" title="${acc.Email ?? ""}">
                            ${acc.Email ?? ""}
                        </td>
                        <td>${acc.RoleName ?? "Chưa có vai trò"}</td>
                        <td class="action-cell">
                            <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${acc.TaiKhoan_id}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-danger btn-delete me-1" data-id="${acc.TaiKhoan_id}"><i class="fas fa-trash"></i></button>
                            <button class="btn btn-sm btn-info btn-detail me-1 text-white" data-id="${acc.TaiKhoan_id}"><i class="fas fa-info-circle"></i></button>
                            <button class="btn btn-sm btn-secondary btn-reset" data-id="${acc.TaiKhoan_id}"><i class="fas fa-key"></i></button>
                        </td>`;
                    tableBody.appendChild(row);
                });

                // Render phân trang
                renderPagination(pageNumbers, currentPage, totalPages);

                // Cập nhật trạng thái nút prev/next
                updatePrevNextButtons(prevBtn, nextBtn);
            })
            .catch(() => showToast("Không thể tải dữ liệu mới!", "error"))
            .finally(() => {
                if (loading) loading.style.display = "none";
            });
    }

    /* ==========================
       RENDER PHÂN TRANG (DỰA TRÊN MẪU)
       ========================== */
    function renderPagination(container, currentPage, totalPages) {
        const fragment = document.createDocumentFragment(); // tạo tạm để tránh flicker

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = "btn btn-sm me-1 page-number";
            btn.textContent = i;

            if (i === currentPage) {
                btn.classList.add("btn-primary");
            } else {
                btn.classList.add("btn-outline-primary");
            }

            btn.addEventListener("click", () => loadAccounts(i));
            fragment.appendChild(btn);
        }

        container.innerHTML = "";
        container.appendChild(fragment); // render một lần, mượt hơn
    }

    /* ==========================
       CẬP NHẬT NÚT PREV/NEXT
       ========================== */
    function updatePrevNextButtons(prevBtn, nextBtn) {
        // Cập nhật trạng thái nút prev/next
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;

        // Thêm class disabled cho Bootstrap
        prevBtn.classList.toggle("disabled", currentPage === 1);
        nextBtn.classList.toggle("disabled", currentPage === totalPages);
    }

    // Sự kiện cho nút prev/next (dựa trên mẫu)
    document.getElementById("prev").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            loadAccounts(currentPage);
        }
    });

    document.getElementById("next").addEventListener("click", function () {
        if (currentPage < totalPages) {
            currentPage++;
            loadAccounts(currentPage);
        }
    });

    // Load dữ liệu ban đầu
    loadAccounts(1);

    /* ==========================
       HIỆU ỨNG FADE-IN/FADE-OUT
       ========================== */
    function animateTable() {
        const tableBody = document.getElementById("accountTableBody");

        // Bắt đầu hiệu ứng fade-out
        tableBody.classList.remove("fade-in");
        tableBody.classList.add("fade-out");

        // Sau một khoảng ngắn thì bật fade-in
        setTimeout(() => {
            tableBody.classList.remove("fade-out");
            tableBody.classList.add("fade-in");
        }, 200); // delay 200ms để mượt
    }


});