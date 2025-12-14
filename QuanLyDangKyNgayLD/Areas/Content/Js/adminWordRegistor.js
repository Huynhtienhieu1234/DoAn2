// Quản lý Đợt Lao Động - Full JS
document.addEventListener("DOMContentLoaded", function () {



    // Map khu vực → ảnh GitHub
    const khuVucImages = {
        "A1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/1.jpg",
        "A2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/2.jpg",
        "B1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/3.jpg",
        "B2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/4.jpg",
        "B3": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/5.jpg",
        "B4": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/6.jpg",
        "C1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/7.jpg",
        "C2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/8.jpg",
        "H1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/9.jpg",
        "H2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/10.jpg",
        "T2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/11.jpg",
        "Trước cổng trường": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/12.jpg"
    };

    // Hàm hiển thị ảnh theo khu vực
    function setAreaImage(imgEl, areaValue) {
        const url = khuVucImages[areaValue] || "";
        if (url) {
            imgEl.src = url;
            imgEl.style.display = "block";
            imgEl.onerror = function () {
                this.style.display = "none";
                showToast("Không tải được ảnh khu vực: " + areaValue, "warning");
            };
        } else {
            imgEl.style.display = "none";
        }
    }

    // Gắn sự kiện cho dropdown trong form Tạo mới
    document.getElementById("createKhuVuc")?.addEventListener("change", function () {
        setAreaImage(document.getElementById("createKhuVucImage"), this.value);
    });

    // Gắn sự kiện cho dropdown trong form Chỉnh sửa
    document.getElementById("editKhuVuc")?.addEventListener("change", function () {
        setAreaImage(document.getElementById("editKhuVucImage"), this.value);
    });







    let currentPage = 1;
    const pageSize = 5;
    let currentLoadedItems = []; // chứa dữ liệu đang hiển thị


    let currentSortField = localStorage.getItem("sortField") || "date";
    let currentSortDir = localStorage.getItem("sortDir") || "desc";
    let thang = "";

    // ==============================
    // 1) Tải dữ liệu lần đầu
    // ==============================
    loadDataToTable();

    // ==============================
    // 2) Hàm load dữ liệu + loading
    // ==============================
    document.getElementById("createForm")?.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        fetch(this.action, { method: "POST", body: formData })
            .then((res) => {
                if (!res.ok) {
                    return res.text().then(text => {
                        console.error("Server response:", text);
                        throw new Error("Server error");
                    });
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById("createModal")).hide();
                    showToast(data.message || "Tạo đợt thành công!");

                    // Tải lại dữ liệu
                    loadDataToTable(currentPage);

                    // Sau khi tải xong, sắp xếp lại để dòng mới nằm cuối
                    //setTimeout(() => {
                    //    sortDotLaoDong(true); // hoặc false nếu bạn muốn tháng mới nhất lên đầu
                    //}, 400);




                } else {
                    showToast(data.message || "Tạo thất bại!");
                }
            })
            .catch((err) => {
                console.error("Lỗi:", err);
                showToast("Lỗi kết nối hoặc server không phản hồi.");
            });
    });

    function isDateSearch(value) {
        return /^\d{2}\/\d{2}\/\d{4}$/.test(value);
    }

    function convertToISODate(ddmmyyyy) {
        const [day, month, year] = ddmmyyyy.split('/');
        return `${year}-${month}-${day}`;
    }




    function loadDataToTable(page = 1, keyword = "", buoi = "", trangthai = "") {

        // ===== XỬ LÝ SEARCH BOX =====
        const keywordRaw = document.getElementById("searchBox")?.value.trim() || "";

        let keywordFinal = "";
        let ngay = "";

        if (isDateSearch(keywordRaw)) {
            ngay = convertToISODate(keywordRaw); // yyyy-MM-dd
        } else {
            keywordFinal = keywordRaw;
        }
        // ============================


        // Kiểm tra nếu từ khóa là ngày tháng
        const tbody = document.getElementById("dotLaoDongTableBody");
        const tableWrapper = document.querySelector(".table-responsive");

        tableWrapper.classList.add("loading");
        tbody.classList.remove("fade-in");
        tbody.classList.add("fade-out");
        tbody.innerHTML = `
        <tr>
            <td colspan="10" class="text-center">
                <div class="spinner"></div> Đang tải dữ liệu...
            </td>
        </tr>
    `;

        fetch(`/Admin/AdminWordRegister/LoadDotLaoDong?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keywordFinal)}&buoi=${encodeURIComponent(buoi)}&trangThai=${encodeURIComponent(trangthai)}&ngay=${encodeURIComponent(ngay)}&thang=${thang ?? ""}&sortField=${currentSortField}&sortDir=${currentSortDir}`)
            .then(res => res.json())

            .then(data => {
                currentLoadedItems = data.items || [];
                tableWrapper.classList.remove("loading");

                if (!data.items || data.items.length === 0) {
                    tbody.innerHTML = "<tr><td colspan='10' class='text-center'>Không có dữ liệu</td></tr>";
                    renderPagination(page, data.totalPages || 1);
                    return;
                }

                setTimeout(() => {
                    renderDataToTable(data.items, page);
                    renderPagination(page, data.totalPages || 1);
                }, 120);
            })
            .catch(() => {
                tableWrapper.classList.remove("loading");
                tbody.innerHTML = "<tr><td colspan='10' class='text-center text-danger'>Lỗi tải dữ liệu</td></tr>";
            });
    }

    function setSort(field) {
        if (currentSortField === field) {
            currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
        } else {
            currentSortField = field;
            currentSortDir = "asc";
        }

        localStorage.setItem("sortField", currentSortField);
        localStorage.setItem("sortDir", currentSortDir);

        currentPage = 1;
        triggerReload();
    }


    // ==============================
    // 3) Render bảng
    // ==============================
    function renderDataToTable(items, page) {
        const tbody = document.getElementById("dotLaoDongTableBody");
        tbody.innerHTML = items.map((item, index) => {
            // Map buổi sang text hiển thị
            let buoiText = item.Buoi;
            if (buoiText === "Sáng") buoiText = "Sáng (7h-8h30)";
            if (buoiText === "Chiều") buoiText = "Chiều (13h-14h)";

            return `
            <tr
              data-id="${item.TaoDotLaoDong_id}" 
              data-mota="${(item.MoTa || '').replace(/"/g, '&quot;').replace(/\n/g, ' ')}"
              data-nguoitao="${String(item.NguoiTao || '').replace(/"/g, '&quot;')}"
            >
            <td>${(page - 1) * pageSize + index + 1}</td>
            <td>${item.DotLaoDong}</td>
            <td>${buoiText}</td>
            <td>${item.LoaiLaoDong || ""}</td>
            <td class="text-success fw-bold">${item.GiaTri ?? ""}</td>
            <td>${item.NgayLaoDong || ""}</td>
            <td>${item.KhuVuc || ""}</td>
            <td class="${item.SoLuongDangKy < item.SoLuongSinhVien ? 'text-danger fw-bold' : 'text-success fw-bold'} text-center">
                ${item.SoLuongDangKy}/${item.SoLuongSinhVien}
            </td>
            <td>
                <span class="badge ${item.TrangThaiDuyet === 'Đã duyệt' ? 'bg-success' : 'bg-warning text-dark'}">
                    ${item.TrangThaiDuyet}
                </span>
            </td>
            <td class="action-cell">
                <button class="btn btn-sm btn-info btn-detail me-1 text-white" 
                        data-id="${item.TaoDotLaoDong_id}" title="Chi tiết">
                    <i class="fas fa-info-circle"></i>
                </button>
                ${item.TrangThaiDuyet === 'Chưa duyệt' ? `
                    <button class="btn btn-sm btn-warning btn-edit me-1" 
                            data-id="${item.TaoDotLaoDong_id}" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete me-1" 
                            data-id="${item.TaoDotLaoDong_id}" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-success btn-approve" 
                            data-id="${item.TaoDotLaoDong_id}" title="Duyệt">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ""}
            </td>
        </tr>
        `;
        }).join("");

        setTimeout(() => {
            tbody.classList.remove("fade-out");
            tbody.classList.add("fade-in");
        }, 50);
    }



    // ==============================
    // 4) Phân trang
    // ==============================
    function renderPagination(page, totalPages) {
        const container = document.getElementById("pageNumbers");
        const prevBtn = document.getElementById("prev");
        const nextBtn = document.getElementById("next");

        container.innerHTML = "";

        if (totalPages <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        prevBtn.disabled = page <= 1;
        prevBtn.onclick = () => gotoPage(page - 1);

        const maxButtons = 7;
        let start = Math.max(1, page - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

        if (start > 1) {
            addPageButton(1);
            if (start > 2) addEllipsis();
        }
        for (let i = start; i <= end; i++) addPageButton(i);
        if (end < totalPages) {
            if (end < totalPages - 1) addEllipsis();
            addPageButton(totalPages);
        }

        nextBtn.disabled = page >= totalPages;
        nextBtn.onclick = () => gotoPage(page + 1);

        function addPageButton(p) {
            const btn = document.createElement("button");
            btn.className = "page-btn";
            btn.textContent = p;
            if (p === page) btn.classList.add("active");
            btn.onclick = () => gotoPage(p);
            container.appendChild(btn);
        }
        function addEllipsis() {
            const span = document.createElement("span");
            span.className = "page-ellipsis";
            span.textContent = "...";
            container.appendChild(span);
        }
        function gotoPage(p) {
            const keyword = document.getElementById("searchBox")?.value || "";

            const buoi = document.getElementById("sessionFilter")?.value || "";
            const trangThai = document.getElementById("statusFilter")?.value || "";
            currentPage = p;
            loadDataToTable(p, keyword, buoi, trangThai);
        }
    }

    // ==============================
    // 5) Mở modal: Tạo mới, Đã xóa
    // ==============================
    document.getElementById("btnAdd")?.addEventListener("click", function () {
        const form = document.getElementById("createForm");
        if (form) form.reset();
        new bootstrap.Modal(document.getElementById("createModal")).show();
    });

    // Replace btnViewDeleted fetch handler with this improved version
    document.getElementById("btnViewDeleted")?.addEventListener("click", function () {
        const body = document.getElementById("deletedTableBody");
        body.innerHTML = `<tr><td colspan="7" class="text-center"><div class="spinner"></div> Đang tải...</td></tr>`;

        fetch("/Admin/AdminWordRegister/GetDeletedDotLaoDong", { credentials: 'same-origin' })
            .then(res => {
                console.log("GetDeletedDotLaoDong status:", res.status, res.statusText);
                const ct = res.headers.get('content-type') || '';
                if (!res.ok) {
                    return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
                }
                if (!ct.includes('application/json')) {
                    return res.text().then(text => { throw new Error('Expected JSON but got: ' + text); });
                }
                return res.json();
            })
            .then(data => {
                if (!data.items || data.items.length === 0) {
                    body.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Không có dữ liệu</td></tr>`;
                } else {
                    const rows = data.items.map((x, i) => {
                        const buoiText = x.Buoi === "Sáng" ? "Sáng (7h-8h30)" :
                            x.Buoi === "Chiều" ? "Chiều (13h-14h)" : (x.Buoi || "");
                        return `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${x.DotLaoDong || ""}</td>
                            <td>${buoiText}</td>
                            <td>${x.NgayLaoDong || ""}</td>
                            <td>${x.KhuVuc || ""}</td>
                            <td>${x.Ngayxoa || ""}</td>
                            <td>
                                <button class="btn btn-sm btn-success btn-restore me-1" data-id="${x.TaoDotLaoDong_id}">
                                    Khôi phục
                                </button>
                                <button class="btn btn-sm btn-danger btn-permanent-delete" data-id="${x.TaoDotLaoDong_id}">
                                    Xóa vĩnh viễn
                                </button>
                            </td>
                        </tr>
                    `;
                    }).join("");

                    body.innerHTML = rows;
                }
                new bootstrap.Modal(document.getElementById("deletedModal")).show();
            })
            .catch(err => {
                console.error("Load deleted items failed:", err);
                body.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
                new bootstrap.Modal(document.getElementById("deletedModal")).show();
            });
    });


    // ==============================
    // 6) Event delegation cho nút trong bảng
    // ==============================
    document.addEventListener("click", function (e) {
        const detailBtn = e.target.closest(".btn-detail");
        const editBtn = e.target.closest(".btn-edit");





        const deleteBtn = e.target.closest(".btn-delete");
        const approveBtn = e.target.closest(".btn-approve");
        const restoreBtn = e.target.closest(".btn-restore");
        const permanentDeleteBtn = e.target.closest(".btn-permanent-delete");

        // Hỗ trợ cả id và class cho nút Xem (tránh trùng id khi render nhiều lần)
        const btnXemChiTiet = e.target.closest("#btnXemChiTietSinhVien, .btn-view-sinhvien");

        // xem chi tiết sinh viên tham gia
        if (btnXemChiTiet) {
            const id = btnXemChiTiet.dataset.id || btnXemChiTiet.getAttribute("data-id");
            const tbody = document.getElementById("sinhVienTableBody");
            const modalEl = document.getElementById("sinhVienModal");
            const pageSize = 5;
            let currentPage = 1;
            let fullData = [];

            if (!tbody || !modalEl) return console.warn("Không tìm thấy bảng hoặc modal sinh viên");

            tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center">Đang tải...</td></tr>`;

            fetch(`/Admin/AdminWordRegister/GetSinhVienThamGia?maDot=${encodeURIComponent(id)}`)
                .then(res => res.json())
                .then(data => {
                    if (!data || !data.success || !Array.isArray(data.data) || data.data.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center">Chưa có sinh viên nào đăng ký</td></tr>`;
                        new bootstrap.Modal(modalEl).show(); // ✅ Đảm bảo modal mở
                        return;
                    }


                    fullData = data.data;

                    function renderPage(page) {
                        currentPage = page;
                        const start = (page - 1) * pageSize;
                        const end = start + pageSize;
                        const pageData = fullData.slice(start, end);

                        tbody.innerHTML = pageData.map((sv, i) => `
                    <tr>
                        <td>${start + i + 1}</td>
                        <td>${sv.TenSinhVien || ""}</td>
                        <td>${sv.TenLop || ""}</td>
                        <td>${sv.TenKhoa || ""}</td>
                    </tr>
                `).join("");

                        renderPagination();
                    }

                    function renderPagination() {
                        const totalPages = Math.ceil(fullData.length / pageSize);
                        const footer = modalEl.querySelector(".modal-footer");
                        if (!footer) return;

                        let nav = footer.querySelector(".pagination-nav");
                        if (!nav) {
                            nav = document.createElement("div");
                            nav.className = "pagination-nav mb-2";
                            footer.prepend(nav);
                        }

                        nav.innerHTML = "";

                        for (let i = 1; i <= totalPages; i++) {
                            const btn = document.createElement("button");
                            btn.className = "btn btn-sm btn-outline-secondary me-1 mb-1";
                            btn.textContent = i;
                            if (i === currentPage) btn.classList.add("active");
                            btn.onclick = () => renderPage(i);
                            nav.appendChild(btn);
                        }
                    }

                    renderPage(1);
                    new bootstrap.Modal(modalEl).show();
                })
                .catch(err => {
                    console.error("Lỗi khi tải danh sách sinh viên:", err);
                    tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Lỗi tải dữ liệu</td></tr>`;
                });

            return;
        }



        // Chi tiết
        if (detailBtn) {
            const tr = detailBtn.closest("tr");
            if (!tr) return;
            const cells = tr.querySelectorAll("td");

            // Gán thông tin cơ bản (kiểm tra tồn tại phần tử trước khi gán)
            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value || "";
            };
            setText("detailDotLaoDong", cells[1]?.textContent);
            setText("detailBuoi", cells[2]?.textContent);
            setText("detailLoaiLaoDong", cells[3]?.textContent);
            setText("detailGiaTri", cells[4]?.textContent);
            setText("detailNgayLaoDong", cells[5]?.textContent);
            setText("detailKhuVuc", cells[6]?.textContent);

            // Số lượng SV + nút Xem (an toàn nếu thiếu /)
            const soLuongRaw = cells[7]?.textContent || "";
            let soDangKy = "", soQuyDinh = "";
            if (soLuongRaw.includes("/")) {
                [soDangKy, soQuyDinh] = soLuongRaw.split("/").map(x => x.trim());
            } else {
                soDangKy = soLuongRaw.trim();
                soQuyDinh = "";
            }
            const soLuongEl = document.getElementById("detailSoLuongSinhVien");
            if (soLuongEl) {
                // Tạo nút bằng class để tránh trùng id khi có nhiều modal/dòng
                soLuongEl.innerHTML = `
                <span class="fw-bold">${soDangKy || "0"}${soQuyDinh ? "/" + soQuyDinh : ""}</span>
                <button class="btn btn-sm btn-outline-primary ms-2 btn-view-sinhvien" data-id="${detailBtn.dataset.id}">
                    <i class="fas fa-users me-1"></i> Xem
                </button>
            `;
            }

            // Trạng thái duyệt
            setText("detailTrangThaiDuyet", tr.querySelector(".badge")?.textContent);

            // Mô tả & người tạo
            setText("detailMoTa", tr.dataset.mota);
            setText("detailNguoiTao", tr.dataset.nguoitao);

            // Ảnh khu vực (kiểm tra tồn tại)
            const khuVucValue = cells[6]?.textContent?.trim() || "";
            const imgEl = document.getElementById("detailKhuVucImage");
            if (imgEl) setAreaImage(imgEl, khuVucValue);

            // Mở modal chi tiết
            const detailModalEl = document.getElementById("detailModal");
            if (detailModalEl) new bootstrap.Modal(detailModalEl).show();

            return;
        }

        // sửa
        if (editBtn) {
            const tr = editBtn.closest("tr");
            if (!tr) return;
            const isApproved = tr.querySelector(".badge")?.textContent === "Đã duyệt";
            if (isApproved) {
                showToast("Đợt đã duyệt không thể chỉnh sửa!", "warning");
                return;
            }

            const cells = tr.querySelectorAll("td");

            const setInputValue = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value || "";
            };

            setInputValue("editId", editBtn.dataset.id);
            const dotText = cells[1]?.textContent?.trim() || "";
            const editMonthSelectEl = document.getElementById("editDotLaoDong");
            if (editMonthSelectEl) {
                editMonthSelectEl.value = [...editMonthSelectEl.options].some(opt => opt.value === dotText) ? dotText : "";
            }


            let buoiRaw = cells[2]?.textContent || "";
            let buoiValue = buoiRaw.includes("Sáng") ? "Sáng" : buoiRaw.includes("Chiều") ? "Chiều" : "";
            setInputValue("editBuoi", buoiValue);



            const loaiTextRaw = cells[3]?.textContent || "";
            const loaiText = loaiTextRaw.toLowerCase().trim();
            const loaiSelect = document.getElementById("editLoaiLaoDong");

            if (loaiSelect) {
                if (loaiText.includes("cá")) {
                    loaiSelect.value = "Cá nhân";
                } else if (loaiText.includes("lớp")) {
                    loaiSelect.value = "Lớp";
                } else {
                    loaiSelect.value = "";
                }
            }






            setInputValue("editGiaTri", (cells[4]?.textContent || "").replace(/\D/g, ""));

            // ===== FIX LOAD NGÀY LAO ĐỘNG (EDIT) =====
            const ngayText = cells[5]?.textContent?.trim(); // dd/MM/yyyy
            const editNgay = document.getElementById("editNgayLaoDong");

            if (editNgay) {
                editNgay.innerHTML = '<option value="">-- Chọn ngày --</option>';

                if (ngayText) {
                    const parts = ngayText.split("/");
                    if (parts.length === 3) {
                        const value = `${parts[2]}-${parts[1]}-${parts[0]}`; // yyyy-MM-dd

                        const opt = document.createElement("option");
                        opt.value = value;
                        opt.textContent = ngayText;
                        opt.selected = true;

                        editNgay.appendChild(opt);
                    }
                }
            }

            const khuVucRaw = cells[6]?.textContent?.trim() || "";
            const khuVucSelect = document.getElementById("editKhuVuc");
            if (khuVucSelect) {
                khuVucSelect.value = [...khuVucSelect.options].some(opt => opt.value === khuVucRaw) ? khuVucRaw : "";
                setAreaImage(document.getElementById("editKhuVucImage"), khuVucSelect.value);
            }

            let soLuongRaw2 = cells[7]?.textContent || "";
            let quyDinh = soLuongRaw2.includes("/") ? soLuongRaw2.split("/")[1]?.trim() || "" : "";
            setInputValue("editSoLuongSinhVien", quyDinh);

            setInputValue("editMoTa", tr.dataset.mota || "");

            const editModalEl = document.getElementById("editModal");
            if (editModalEl) new bootstrap.Modal(editModalEl).show();

            return;
        }

        // xóa mềm
        if (deleteBtn) {
            const tr = deleteBtn.closest("tr");
            if (!tr) return;
            const tenDot = tr.querySelector("td:nth-child(2)")?.textContent || "";
            const id = deleteBtn.dataset.id;

            const isApproved = tr.querySelector(".badge")?.textContent === "Đã duyệt";
            if (isApproved) {
                showToast("Đợt đã duyệt không thể xóa!", "warning");
                return;
            }

            closeModalIfOpen("deletedModal");
            closeModalIfOpen("editModal");
            closeModalIfOpen("detailModal");

            const deleteConfirmText = document.getElementById("deleteConfirmText");
            const deleteDotInfo = document.getElementById("deleteDotInfo");
            const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
            if (deleteConfirmText) deleteConfirmText.textContent = "Bạn có chắc chắn muốn xóa đợt này?";
            if (deleteDotInfo) deleteDotInfo.textContent = `Đợt: ${tenDot} (ID: ${id})`;
            if (confirmDeleteBtn) {
                confirmDeleteBtn.dataset.id = id;
                confirmDeleteBtn.dataset.mode = "soft";
            }

            const deleteModalEl = document.getElementById("deleteModal");
            if (deleteModalEl) new bootstrap.Modal(deleteModalEl).show();

            return;
        }

        // xóa vĩnh viễn
        if (permanentDeleteBtn) {
            const tr = permanentDeleteBtn.closest("tr");
            if (!tr) return;
            const tenDot = tr.querySelector("td:nth-child(2)")?.textContent || "";
            const id = permanentDeleteBtn.dataset.id;

            const isApproved = tr.querySelector(".badge")?.textContent === "Đã duyệt";
            if (isApproved) {
                showToast("Đợt đã duyệt không thể xóa vĩnh viễn!", "warning");
                return;
            }

            closeModalIfOpen("deletedModal");

            const deleteConfirmText = document.getElementById("deleteConfirmText");
            const deleteDotInfo = document.getElementById("deleteDotInfo");
            const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
            if (deleteConfirmText) deleteConfirmText.textContent = "⚠️ Bạn có chắc chắn muốn xóa vĩnh viễn đợt này?";
            if (deleteDotInfo) deleteDotInfo.textContent = `Đợt: ${tenDot} (ID: ${id})`;
            if (confirmDeleteBtn) {
                confirmDeleteBtn.dataset.id = id;
                confirmDeleteBtn.dataset.mode = "hard";
            }

            const deleteModalEl = document.getElementById("deleteModal");
            if (deleteModalEl) new bootstrap.Modal(deleteModalEl).show();

            return;
        }

        // Duyệt
        if (approveBtn) {
            const id = approveBtn.dataset.id;
            if (!id) return;
            fetch(`/Admin/AdminWordRegister/ApproveAjax?id=${encodeURIComponent(id)}`, { method: "POST" })
                .then(res => res.json())
                .then(data => {
                    showToast(data.message || (data.success ? "Đã duyệt đợt lao động!" : "Duyệt thất bại"), data.success ? "success" : "error");
                    loadDataToTable(currentPage);
                })
                .catch(() => {
                    showToast("Lỗi kết nối đến máy chủ!", "error");
                });
            return;
        }

        // Khôi phục
        if (restoreBtn) {
            const id = restoreBtn.dataset.id;
            const row = restoreBtn.closest("tr");
            if (!id) return;
            restoreBtn.disabled = true;

            fetch(`/Admin/AdminWordRegister/RestoreAjax?id=${encodeURIComponent(id)}`, { method: "POST", credentials: 'same-origin' })
                .then(res => {
                    if (!res.ok) return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
                    const ct = res.headers.get('content-type') || '';
                    if (!ct.includes('application/json')) return res.text().then(text => { throw new Error('Invalid JSON: ' + text); });
                    return res.json();
                })
                .then(data => {
                    showToast(data.message || (data.success ? "Đã khôi phục đợt lao động!" : "Khôi phục thất bại"), data.success ? "success" : "error");
                    if (data.success && row) {
                        row.style.transition = "opacity 0.4s ease";
                        row.style.opacity = "0";
                        setTimeout(() => row.remove(), 400);
                    }
                    loadDataToTable(currentPage);
                })
                .catch(err => {
                    console.error("Restore failed:", err);
                    showToast("Lỗi khôi phục hoặc kết nối!", "error");
                })
                .finally(() => {
                    restoreBtn.disabled = false;
                });

            return;
        }
    });


    // ==============================
    // 7) Submit form AJAX: Create, Edit, Delete
    // ==============================


    document.getElementById("editForm")?.addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch(this.action, { method: "POST", body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
                    showToast(data.message || "Cập nhật thành công!");
                    loadDataToTable(currentPage);
                } else {
                    showToast(data.message || "Cập nhật thất bại!");
                }
            })
            .catch(() => showToast("Lỗi kết nối!"));
    });
    document.getElementById("confirmDeleteBtn")?.addEventListener("click", function () {
        const id = this.dataset.id;
        const mode = this.dataset.mode;
        const url = mode === "hard"
            ? `/Admin/AdminWordRegister/DeleteForever?id=${id}`
            : `/Admin/AdminWordRegister/DeleteAjax?id=${id}`;


        console.log("Xác nhận xóa:", { id, mode, url });

        fetch(url, { method: "POST" })
            .then(res => {
                if (!res.ok) {
                    return res.text().then(text => {
                        console.error("Lỗi server:", text);
                        throw new Error("Server error");
                    });
                }
                return res.json();
            })
            .then(data => {
                console.log("Kết quả trả về:", data);
                closeModalIfOpen("deleteModal");
                showToast(data.message || (data.success ? "Đã xóa" : "Xóa thất bại"), data.success ? "success" : "error");
                loadDataToTable(currentPage);
            })
            .catch(err => {
                console.error("Lỗi kết nối:", err);
                showToast("Lỗi kết nối hoặc server không phản hồi!", "error");
            });

    });





    // ==============================
    // 8) Bộ lọc + tìm kiếm
    // ==============================
    document.getElementById("statusFilter")?.addEventListener("change", triggerReload);
    document.getElementById("sessionFilter")?.addEventListener("change", triggerReload);
    document.getElementById("searchBox")?.addEventListener("input", debounce(triggerReload, 300));

    function triggerReload() {
        const keyword = document.getElementById("searchBox")?.value || "";
        const buoi = document.getElementById("sessionFilter")?.value || "";
        const trangThai = document.getElementById("statusFilter")?.value || "";
        currentPage = 1;
        loadDataToTable(1, keyword, buoi, trangThai);
    }

    function debounce(fn, delay) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ==============================
    // 9) Tự động sinh ngày khi chọn tháng (Choices.js)
    // ==============================
    const monthSelect = document.getElementById("dotLaoDongMonth");
    const daySelect = document.getElementById("dotLaoDongDay");
    let dayChoices;

    if (daySelect) {
        dayChoices = new Choices(daySelect, {
            shouldSort: false,
            position: 'bottom',
            searchEnabled: false,
            itemSelectText: '',
        });
    }

    if (monthSelect && dayChoices) {
        const currentYear = new Date().getFullYear();

        // ✅ Chọn tháng hiện tại
        const currentMonthNumber = new Date().getMonth() + 1;
        const currentMonthLabel = `Tháng ${currentMonthNumber}`;
        monthSelect.value = currentMonthLabel;
        fillDays(currentMonthLabel);

        monthSelect.addEventListener("change", function () {
            fillDays(this.value);
        });

        function fillDays(monthLabel) {
            if (!monthLabel) {
                dayChoices.clearChoices();
                return;
            }

            const monthNumber = parseInt(monthLabel.replace("Tháng ", ""));
            const daysInMonth = new Date(currentYear, monthNumber, 0).getDate();

            const today = new Date();
            const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const choicesArray = [];

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(currentYear, monthNumber - 1, d);
                if (date >= todayMidnight) {
                    const dayStr = String(d).padStart(2, "0");
                    const monthStr = String(monthNumber).padStart(2, "0");
                    const value = `${currentYear}-${monthStr}-${dayStr}`;
                    const label = `${dayStr}/${monthStr}/${currentYear}`;
                    choicesArray.push({
                        value: value,
                        label: label,
                        selected: choicesArray.length === 0
                    });
                }
            }

            dayChoices.setChoices(choicesArray, 'value', 'label', true);
        }
    }


    









    // ==============================
    // 11. Xuất Excel TOÀN BỘ dữ liệu (dùng action có sẵn)
    // ==============================
    document.getElementById("exportExcel")?.addEventListener("click", exportDotLaoDong);

    function exportDotLaoDong() {
        fetch('/Admin/AdminWordRegister/ExportAllDotLaoDong')
            .then(r => r.json())
            .then(data => {
                if (!data.success) {
                    showToast("Không có dữ liệu để xuất!", "warning");
                    return;
                }

                // ===== Bảng 1: Đợt Lao Động =====
                let html = `
                <meta charset="UTF-8">
                <style>
                    table {
                        border-collapse: collapse;
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 14px;
                        width: 100%;
                    }
                    th, td {
                        border: 1px solid black;
                        padding: 6px;
                        text-align: center;
                        vertical-align: middle;
                    }
                    h2 {
                        text-align: center;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                </style>
                <h2>BẢNG ĐỢT LAO ĐỘNG</h2>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên Đợt</th>
                            <th>Buổi</th>
                            <th>Loại Lao Động</th>
                            <th>Giá Trị</th>
                            <th>Ngày Lao Động</th>
                            <th>Khu Vực</th>
                            <th>Đăng ký/Quy định</th>
                            <th>Trạng Thái</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

                (data.dotList || []).forEach((item, i) => {
                    const soDangKy = item.SoLuongDangKy || 0;
                    const quyDinh = item.SoLuongSinhVien || 0;
                    const boldStyle = item.TrangThaiDuyet === "Đã duyệt" ? "font-weight:bold;" : "";

                    html += `<tr style="${boldStyle}">
                    <td>${i + 1}</td>
                    <td>${item.DotLaoDong}</td>
                    <td>${item.Buoi}</td>
                    <td>${item.LoaiLaoDong}</td>
                    <td>${item.GiaTri}</td>
                    <td>${item.NgayLaoDong}</td>
                    <td>${item.KhuVuc}</td>
                    <td>${soDangKy}/${quyDinh}</td>
                    <td>${item.TrangThaiDuyet}</td>
                </tr>`;
                });

                html += `</tbody></table><br/><br/>`;

                // ===== Bảng 2: Sinh Viên tham gia =====
                html += `
                <h2>BẢNG SINH VIÊN THAM GIA</h2>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>MSSV</th>
                            <th>Họ Tên</th>
                            <th>Lớp</th>
                            <th>Khoa</th>
                            <th>Đợt Lao Động</th>
                            <th>Buổi</th>
                            <th>Ngày Xác Nhận</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

                (data.sinhVienList || []).forEach((sv, i) => {
                    html += `<tr>
                    <td>${i + 1}</td>
                    <td>${sv.MSSV}</td>
                    <td>${sv.HoTen}</td>
                    <td>${sv.Lop}</td>
                    <td>${sv.Khoa}</td>
                    <td>${sv.DotLaoDong}</td>
                    <td>${sv.Buoi}</td>
                    <td>${sv.NgayXacNhan}</td>
                </tr>`;
                });

                html += `</tbody></table>`;

                // Xuất file Excel
                const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `DotLaoDong_SinhVien_${new Date().toISOString().slice(0, 10)}.xls`;
                a.click();
                URL.revokeObjectURL(url);

                showToast("Xuất Excel thành công!", "success");
            })
            .catch(() => showToast("Lỗi tải dữ liệu!", "error"));
    }


    // ==============================
    // Tự động sinh ngày cho form Chỉnh sửa
    // ==============================
    const editMonthSelect = document.getElementById("editDotLaoDong");

    const editDaySelect = document.getElementById("editNgayLaoDong");

    if (editMonthSelect && editDaySelect) {
        editMonthSelect.addEventListener("change", function () {
            const monthLabel = this.value;
            const currentYear = new Date().getFullYear();
            const monthNumber = parseInt(monthLabel.replace("Tháng ", ""));
            const daysInMonth = new Date(currentYear, monthNumber, 0).getDate();

            editDaySelect.innerHTML = '<option value="">-- Chọn ngày --</option>';
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = String(d).padStart(2, "0");
                const monthStr = String(monthNumber).padStart(2, "0");
                const value = `${currentYear}-${monthStr}-${dayStr}`;
                const label = `${dayStr}/${monthStr}/${currentYear}`;
                const option = document.createElement("option");
                option.value = value;
                option.textContent = label;
                editDaySelect.appendChild(option);
            }
        });
    }




    // Hàm đóng modal nếu đang mở
    function closeModalIfOpen(modalId) {
        const modalEl = document.getElementById(modalId);
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }

    document.getElementById("sortMonthSelect")?.addEventListener("change", function () {
        const value = this.value;
        if (!value) return;

        // Mặc định sort theo NGÀY LAO ĐỘNG
        currentSortField = "date";
        currentSortDir = value;

        localStorage.setItem("sortField", currentSortField);
        localStorage.setItem("sortDir", currentSortDir);

        currentPage = 1;
        triggerReload();
    });





});