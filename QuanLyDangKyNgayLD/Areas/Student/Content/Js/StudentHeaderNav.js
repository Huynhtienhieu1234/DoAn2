(function () {
    "use strict";

    var currentNewBatchIds = [];

    function setText(id, text) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    function initHeaderNav() {
        var toggle = document.getElementById("studentHeaderNavToggle");
        var nav = document.getElementById("studentHeaderNav");

        if (!toggle || !nav) {
            return;
        }

        function closeNav() {
            nav.classList.remove("show");
            toggle.setAttribute("aria-expanded", "false");
        }

        toggle.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            var isOpen = nav.classList.toggle("show");
            toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });

        document.addEventListener("click", function (event) {
            if (!nav.contains(event.target) && !toggle.contains(event.target)) {
                closeNav();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeNav();
            }
        });

        nav.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", closeNav);
        });
    }

    function initUserMenu() {
        var userMenu = document.getElementById("userMenu");
        var dropdownMenu = document.getElementById("dropdownMenu");
        var logoutItem = document.getElementById("logoutDropdownItem");
        var logoutModalElement = document.getElementById("logoutModal");

        if (!userMenu || !dropdownMenu) {
            return;
        }

        function closeUserMenu() {
            userMenu.classList.remove("open");
            dropdownMenu.classList.remove("show");
            userMenu.setAttribute("aria-expanded", "false");
        }

        function toggleUserMenu() {
            var isOpen = !dropdownMenu.classList.contains("show");
            userMenu.classList.toggle("open", isOpen);
            dropdownMenu.classList.toggle("show", isOpen);
            userMenu.setAttribute("aria-expanded", isOpen ? "true" : "false");
        }

        userMenu.addEventListener("click", function (event) {
            event.stopPropagation();
            toggleUserMenu();
        });

        userMenu.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleUserMenu();
            }
        });

        document.addEventListener("click", function (event) {
            if (!userMenu.contains(event.target)) {
                closeUserMenu();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeUserMenu();
            }
        });

        if (logoutItem && logoutModalElement && window.bootstrap) {
            logoutItem.addEventListener("click", function (event) {
                event.preventDefault();
                closeUserMenu();
                var logoutModal = bootstrap.Modal.getOrCreateInstance(logoutModalElement);
                logoutModal.show();
            });
        }
    }

    function loadLayoutUser() {
        fetch("/Student/MainSinhVien/GetStudentInfo", {
            headers: { "X-Requested-With": "XMLHttpRequest" },
            cache: "no-store"
        })
            .then(function (response) { return response.json(); })
            .then(function (res) {
                if (!res || !res.success || !res.data) {
                    return;
                }

                var hoTen = res.data.HoTen || "Sinh viên";
                setText("layoutUserName", hoTen);

                var avatar = document.getElementById("layoutAvatar");
                if (!avatar) {
                    return;
                }

                avatar.onerror = function () {
                    this.onerror = null;
                    this.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(hoTen) + "&background=2563eb&color=fff&size=150&bold=true";
                };

                var hasAvatar = res.data.Avatar && res.data.Avatar.trim() !== "" && res.data.Avatar.indexOf("Avarta.png") === -1;
                if (hasAvatar) {
                    avatar.src = res.data.Avatar;
                } else {
                    avatar.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(hoTen) + "&background=2563eb&color=fff&size=150&bold=true";
                }
            })
            .catch(function () {
                console.warn("Không tải được thông tin người dùng cho header.");
            });
    }

    function getSeenBatchIds() {
        try {
            var stored = localStorage.getItem("seenLaborBatchIds");
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    function markAllBatchesAsSeen() {
        try {
            if (currentNewBatchIds && currentNewBatchIds.length > 0) {
                localStorage.setItem("seenLaborBatchIds", JSON.stringify(currentNewBatchIds));
            }

            var headerBadge = document.getElementById("headerBellBadge");
            if (headerBadge) {
                headerBadge.style.display = "none";
            }

            var cardBadge = document.getElementById("badgeThongBaoCount");
            if (cardBadge) {
                cardBadge.style.display = "none";
            }
        } catch (e) {
            // Bỏ qua lỗi localStorage
        }
    }

    function loadThongBaoLaoDong() {
        fetch("/Student/MainSinhVien/GetThongBaoDotMoi?_t=" + Date.now(), {
            headers: { "X-Requested-With": "XMLHttpRequest" },
            cache: "no-store"
        })
            .then(function (response) { return response.json(); })
            .then(function (res) {
                var tbody = document.getElementById("thongBaoTableBody");
                var headerBadge = document.getElementById("headerBellBadge");
                var cardBadge = document.getElementById("badgeThongBaoCount");

                if (!res.success || !res.data || res.data.length === 0) {
                    if (tbody) {
                        tbody.innerHTML = "" +
                            "<tr>" +
                            "  <td colspan=\"5\" class=\"student-empty\">" +
                            "    <i class=\"fas fa-inbox\"></i>" +
                            "    <p class=\"student-empty-title\">Hiện tại chưa có thông báo đợt lao động mới</p>" +
                            "  </td>" +
                            "</tr>";
                    }
                    if (headerBadge) {
                        headerBadge.style.display = "none";
                    }
                    if (cardBadge) {
                        cardBadge.style.display = "none";
                    }
                    return;
                }

                currentNewBatchIds = res.data.map(function (item) {
                    return item.TaoDotLaoDong_id;
                });

                var seenIds = getSeenBatchIds();
                var unseenList = currentNewBatchIds.filter(function (id) {
                    return seenIds.indexOf(id) === -1;
                });
                var unseenCount = unseenList.length;

                if (unseenCount > 0) {
                    if (headerBadge) {
                        headerBadge.textContent = unseenCount > 99 ? "99+" : unseenCount;
                        headerBadge.style.display = "flex";
                    }
                    if (cardBadge) {
                        cardBadge.textContent = unseenCount + " đợt mới";
                        cardBadge.style.display = "inline-block";
                    }
                } else {
                    if (headerBadge) {
                        headerBadge.style.display = "none";
                    }
                    if (cardBadge) {
                        cardBadge.style.display = "none";
                    }
                }

                if (tbody) {
                    var html = "";
                    res.data.forEach(function (item, index) {
                        var isNew = seenIds.indexOf(item.TaoDotLaoDong_id) === -1;
                        var buoiBadge = (item.Buoi || "").toLowerCase().indexOf("sáng") !== -1
                            ? "<span class=\"badge bg-warning text-dark\"><i class=\"fas fa-sun me-1\"></i>" + item.Buoi + "</span>"
                            : "<span class=\"badge bg-info text-white\"><i class=\"fas fa-cloud-sun me-1\"></i>" + item.Buoi + "</span>";

                        var newBadge = isNew
                            ? "<span class=\"badge bg-danger rounded-pill ms-1\" style=\"font-size: 0.65rem;\">Mới</span>"
                            : "";

                        html += "" +
                            "<tr style=\"cursor: pointer;\" onclick=\"window.location.href='/Student/StudentRegisterWord'\">" +
                            "  <td class=\"text-center fw-bold text-muted\">" + (index + 1) + "</td>" +
                            "  <td>" +
                            "    <div class=\"fw-bold text-primary mb-1\">" +
                            "      <i class=\"fas fa-bullhorn text-warning me-1\"></i>" + item.TieuDe + " " + newBadge +
                            "    </div>" +
                            "    <div class=\"small text-muted\">" +
                            "      <span class=\"badge bg-secondary-subtle text-secondary border me-1\">" + (item.LoaiLaoDong || "Cá nhân") + "</span>" +
                            "      <span class=\"badge bg-light text-dark border\"><i class=\"fas fa-map-marker-alt text-danger me-1\"></i>" + (item.KhuVuc || "Chưa rõ") + "</span>" +
                            "    </div>" +
                            "  </td>" +
                            "  <td>" +
                            "    <div class=\"text-secondary small mb-1\">" + item.MoTa + "</div>" +
                            "    <div class=\"small text-dark fw-semibold\">" +
                            "      <span>Giá trị: <b class=\"text-success\">" + item.GiaTri + " buổi</b></span>" +
                            "      <span class=\"ms-2\">Chỉ tiêu: <b class=\"text-primary\">" + item.SoLuongSinhVien + " SV</b></span>" +
                            "    </div>" +
                            "  </td>" +
                            "  <td class=\"text-center text-nowrap\">" +
                            "    <div class=\"fw-bold text-dark\">" + item.NgayLaoDong + "</div>" +
                            "    <div class=\"mt-1\">" + buoiBadge + "</div>" +
                            "  </td>" +
                            "  <td class=\"text-center text-nowrap\">" +
                            "    <a href=\"/Student/StudentRegisterWord\" class=\"btn btn-sm btn-primary rounded-pill px-3 fw-bold shadow-sm\" onclick=\"event.stopPropagation();\">" +
                            "      <i class=\"fas fa-user-plus me-1\"></i>Đăng ký" +
                            "    </a>" +
                            "  </td>" +
                            "</tr>";
                    });
                    tbody.innerHTML = html;
                }

                var modalElement = document.getElementById("modalThongBao");
                if (modalElement && !modalElement.dataset.seenListenerAdded) {
                    modalElement.dataset.seenListenerAdded = "true";
                    modalElement.addEventListener("show.bs.modal", markAllBatchesAsSeen);
                }
            })
            .catch(function () {
                var tbody = document.getElementById("thongBaoTableBody");
                if (tbody) {
                    tbody.innerHTML = "" +
                        "<tr>" +
                        "  <td colspan=\"5\" class=\"student-empty is-error\">" +
                        "    <i class=\"fas fa-triangle-exclamation\"></i>" +
                        "    <p class=\"student-empty-title\">Không thể tải danh sách thông báo.</p>" +
                        "  </td>" +
                        "</tr>";
                }
            });
    }

    function showToast(message, type) {
        var toastContainer = document.getElementById("toastContainer");
        if (!toastContainer || !window.bootstrap) {
            return;
        }

        var toastType = type === "error" ? "danger" : (type || "info");
        var toastEl = document.createElement("div");
        toastEl.className = "toast align-items-center text-bg-" + toastType + " border-0 rounded-3 shadow";
        toastEl.setAttribute("role", "alert");
        toastEl.setAttribute("aria-live", "assertive");
        toastEl.setAttribute("aria-atomic", "true");
        toastEl.innerHTML =
            "<div class=\"d-flex\">" +
            "  <div class=\"toast-body fw-medium\"></div>" +
            "  <button type=\"button\" class=\"btn-close btn-close-white me-2 m-auto\" data-bs-dismiss=\"toast\"></button>" +
            "</div>";

        toastEl.querySelector(".toast-body").textContent = message;
        toastContainer.appendChild(toastEl);

        var toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 });
        toast.show();
        toastEl.addEventListener("hidden.bs.toast", function () {
            toastEl.remove();
        });
    }

    function syncEmptyTableState(wrapper) {
        var table = wrapper.querySelector("table");
        var tbody = table ? table.querySelector("tbody") : null;
        if (!tbody) {
            return;
        }

        var rows = tbody.querySelectorAll("tr");
        var isEmpty = rows.length === 1 && !!tbody.querySelector("td.student-empty");
        wrapper.classList.toggle("table-responsive-empty", isEmpty);
    }

    function initEmptyTableStates() {
        var wrappers = document.querySelectorAll(".table-responsive");
        if (!wrappers.length) {
            return;
        }

        wrappers.forEach(syncEmptyTableState);

        if (!window.MutationObserver) {
            return;
        }

        var observer = new MutationObserver(function (mutations) {
            var updated = [];
            mutations.forEach(function (mutation) {
                var node = mutation.target;
                if (node.nodeType !== 1) {
                    node = node.parentElement;
                }
                var wrapper = node && node.closest ? node.closest(".table-responsive") : null;
                if (wrapper && updated.indexOf(wrapper) === -1) {
                    updated.push(wrapper);
                    syncEmptyTableState(wrapper);
                }
            });
        });

        wrappers.forEach(function (wrapper) {
            var tbody = wrapper.querySelector("table tbody");
            if (tbody) {
                observer.observe(tbody, { childList: true, subtree: true });
            }
        });
    }

    function initStudentHeader() {
        initHeaderNav();
        initUserMenu();
        initEmptyTableStates();
        loadLayoutUser();
        loadThongBaoLaoDong();
    }

    window.showToast = showToast;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initStudentHeader);
    } else {
        initStudentHeader();
    }
})();
