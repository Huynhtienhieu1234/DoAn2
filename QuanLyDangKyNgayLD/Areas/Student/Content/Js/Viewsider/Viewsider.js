document.addEventListener("DOMContentLoaded", function () {

    /* ===============================
       TOAST HIỆU ỨNG
    =============================== */
    const toastEl = document.querySelector('.toast');
    if (toastEl) {
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();

        const progressBar = toastEl.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.transition = "width 5s linear";
            progressBar.style.width = "0%";
        }

        setTimeout(() => {
            toastEl.style.animation = "slideOutUp 0.7s forwards";
            setTimeout(() => toastEl.remove(), 700);
        }, 5000);

        const closeBtn = toastEl.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toastEl.style.animation = "slideOutUp 0.5s forwards";
                setTimeout(() => toastEl.remove(), 500);
            });
        }
    }

    /* ===============================
       DROPDOWN USER
    =============================== */
    const userMenu = document.getElementById('userMenu');
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (userMenu && dropdownMenu) {
        userMenu.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        document.addEventListener('click', function (e) {
            if (!userMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    /* ===============================
       CHATBOT AI TRỢ LÝ LAO ĐỘNG
    =============================== */
    const chatBubble = document.getElementById("chatBubble");
    const chatBox = document.getElementById("chatBox");
    const closeChat = document.getElementById("closeChat");
    const resetChat = document.getElementById("resetChat");
    const sendChat = document.getElementById("sendChat");
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");
    const chatSuggestionsBar = document.getElementById("chatSuggestionsBar");

    // Hàm chuẩn hóa chuỗi không dấu để so sánh từ khóa
    function removeVietnameseTones(str) {
        if (!str) return "";
        return str.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .trim();
    }

    // Cuộn tin nhắn xuống đáy
    function scrollChatToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // Hiển thị tin nhắn dạng bubble đẹp mắt
    function addChatMessage(content, sender = "bot", isHtml = true) {
        if (!chatMessages) return;

        const wrapper = document.createElement("div");
        wrapper.className = sender === "user" ? "d-flex justify-content-end mb-2" : "d-flex justify-content-start mb-2";

        const bubble = document.createElement("div");
        bubble.className = `chat-message-bubble ${sender}`;

        if (isHtml) {
            bubble.innerHTML = content;
        } else {
            bubble.textContent = content;
        }

        wrapper.appendChild(bubble);
        chatMessages.appendChild(wrapper);
        scrollChatToBottom();
    }

    // Hiển thị hiệu ứng Bot đang soạn tin nhắn
    function showTypingIndicator() {
        hideTypingIndicator();
        const wrapper = document.createElement("div");
        wrapper.id = "botTypingIndicator";
        wrapper.className = "d-flex justify-content-start mb-2";
        wrapper.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        chatMessages.appendChild(wrapper);
        scrollChatToBottom();
    }

    // Ẩn hiệu ứng soạn tin nhắn
    function hideTypingIndicator() {
        const indicator = document.getElementById("botTypingIndicator");
        if (indicator) {
            indicator.remove();
        }
    }

    // Tin nhắn chào mừng ban đầu
    function showWelcomeMessage() {
        if (!chatMessages) return;
        chatMessages.innerHTML = "";
        const welcomeHtml = `
            <div>
                <div class="fw-bold mb-1 text-primary"><i class="fas fa-robot me-1"></i> Xin chào bạn!</div>
                <div class="text-secondary small mb-2">Tôi là <strong>Trợ Lý Lao Động AI</strong>. Tôi có thể hỗ trợ bạn tra cứu:</div>
                <ul class="ps-3 mb-2 small text-dark" style="line-height: 1.6;">
                    <li>📊 <strong>Tiến độ hoàn thành</strong> số ngày công</li>
                    <li>📅 <strong>Lịch trực lao động</strong> sắp tới</li>
                    <li>⏰ <strong>Quy định giờ giấc</strong> ca sáng & chiều</li>
                    <li>📱 <strong>Hướng dẫn điểm danh</strong> mã QR / PIN</li>
                    <li>📜 <strong>Điều kiện nhận giấy</strong> xác nhận</li>
                </ul>
                <div class="text-muted small fst-italic">👉 Hãy bấm các nút bên dưới hoặc nhập câu hỏi của bạn nhé!</div>
            </div>
        `;
        addChatMessage(welcomeHtml, "bot", true);
    }

    // 1. API: Lấy tiến độ số ngày công hoàn thành
    function fetchCompletedDays() {
        showTypingIndicator();
        fetch("/Student/ChatBot/GetCompletedDays")
            .then(res => res.json())
            .then(data => {
                hideTypingIndicator();
                if (data.success) {
                    const statusBadge = data.isFinished 
                        ? `<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Đã Đạt Chuẩn</span>`
                        : `<span class="badge bg-warning text-dark"><i class="fas fa-hourglass-half me-1"></i>Đang Tích Lũy</span>`;

                    const progressCard = `
                        <div>
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="fw-bold text-dark"><i class="fas fa-chart-line text-primary me-1"></i>Tiến Độ Lao Động</span>
                                ${statusBadge}
                            </div>
                            <div class="small text-muted mb-2">Sinh viên: <strong>${data.studentName}</strong> (${data.mssv})</div>
                            
                            <div class="chat-progress-card">
                                <div class="d-flex justify-content-between small fw-bold mb-1">
                                    <span>Đã hoàn thành:</span>
                                    <span class="text-primary">${data.completedDays} / ${data.targetDays} ngày (${data.percent}%)</span>
                                </div>
                                <div class="progress" style="height: 10px; border-radius: 6px; background-color: #e2e8f0;">
                                    <div class="progress-bar ${data.isFinished ? 'bg-success' : 'bg-primary'}" 
                                         role="progressbar" 
                                         style="width: ${data.percent}%; border-radius: 6px;">
                                    </div>
                                </div>
                                <div class="mt-2 small ${data.isFinished ? 'text-success fw-bold' : 'text-secondary'}">
                                    ${data.isFinished 
                                        ? '🎉 Bạn đã hoàn thành đủ chỉ tiêu nghĩa vụ lao động!' 
                                        : `👉 Cần thêm <strong>${data.remainingDays} ngày</strong> nữa để hoàn thành.`}
                                </div>
                            </div>

                            <div class="mt-2 text-end">
                                <a href="/Student/StudentTK/Index" class="btn btn-sm btn-outline-primary py-0 px-2 small" style="font-size: 11px;">
                                    <i class="fas fa-external-link-alt me-1"></i>Xem bảng thống kê
                                </a>
                            </div>
                        </div>
                    `;
                    addChatMessage(progressCard, "bot", true);
                } else {
                    addChatMessage(`⚠️ ${data.message || "Không thể lấy thông tin tiến độ."}`, "bot", true);
                }
            })
            .catch(err => {
                hideTypingIndicator();
                addChatMessage("❌ Đã xảy ra lỗi kết nối đến máy chủ. Vui lòng thử lại sau.", "bot", true);
            });
    }

    // 2. API: Lấy danh sách lịch trực sắp tới
    function fetchUpcomingSchedule() {
        showTypingIndicator();
        fetch("/Student/ChatBot/GetUpcomingSchedule")
            .then(res => res.json())
            .then(data => {
                hideTypingIndicator();
                if (data.success) {
                    if (!data.schedules || data.schedules.length === 0) {
                        const emptyHtml = `
                            <div>
                                <div class="fw-bold text-dark mb-1"><i class="fas fa-calendar-check text-success me-1"></i>Lịch Trực Sắp Tới</div>
                                <div class="small text-muted mb-2">Hiện tại bạn <strong>chưa có lịch trực nào sắp tới</strong>.</div>
                                <div class="text-end">
                                    <a href="/Student/StudentRegisterWord/Index" class="btn btn-sm btn-primary py-1 px-2 small" style="font-size: 12px;">
                                        <i class="fas fa-plus me-1"></i>Đăng ký ca mới ngay
                                    </a>
                                </div>
                            </div>
                        `;
                        addChatMessage(emptyHtml, "bot", true);
                        return;
                    }

                    let scheduleItems = "";
                    data.schedules.slice(0, 4).forEach(item => {
                        const buoiBadge = item.Buoi === "Sáng" 
                            ? `<span class="badge bg-warning text-dark"><i class="fas fa-sun me-1"></i>Sáng (07h00)</span>` 
                            : `<span class="badge bg-info text-white"><i class="fas fa-cloud-sun me-1"></i>Chiều (13h30)</span>`;
                        
                        scheduleItems += `
                            <div class="chat-schedule-item">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <strong class="text-primary"><i class="far fa-calendar-alt me-1"></i>${item.NgayLaoDong}</strong>
                                    ${buoiBadge}
                                </div>
                                <div class="text-secondary small">
                                    <i class="fas fa-map-marker-alt text-danger me-1"></i>Khu vực: <strong>${item.KhuVuc}</strong>
                                </div>
                                <div class="d-flex justify-content-between text-muted small mt-1">
                                    <span>Loại: ${item.LoaiLaoDong}</span>
                                    <span class="text-success"><i class="fas fa-check-circle me-1"></i>${item.TrangThaiDuyet}</span>
                                </div>
                            </div>
                        `;
                    });

                    const scheduleCard = `
                        <div>
                            <div class="fw-bold text-dark mb-1 d-flex justify-content-between align-items-center">
                                <span><i class="fas fa-calendar-alt text-success me-1"></i>Lịch Trực Sắp Tới (${data.upcomingCount})</span>
                            </div>
                            <div class="small text-muted mb-1">Danh sách các ca bạn đã đăng ký:</div>
                            ${scheduleItems}
                            <div class="mt-2 text-end">
                                <a href="/Student/StudentListDay/Index" class="btn btn-sm btn-outline-primary py-0 px-2 small" style="font-size: 11px;">
                                    <i class="fas fa-list me-1"></i>Xem tất cả lịch
                                </a>
                            </div>
                        </div>
                    `;
                    addChatMessage(scheduleCard, "bot", true);
                } else {
                    addChatMessage(`⚠️ ${data.message || "Không thể lấy danh sách lịch trực."}`, "bot", true);
                }
            })
            .catch(err => {
                hideTypingIndicator();
                addChatMessage("❌ Lỗi khi tải lịch lao động. Vui lòng kiểm tra lại kết nối mạng.", "bot", true);
            });
    }

    // 3. Trả lời Quy định giờ giấc
    function replyTimeRegulations() {
        const timeHtml = `
            <div>
                <div class="fw-bold text-warning-emphasis mb-1"><i class="fas fa-clock text-warning me-1"></i>Quy Định Giờ Giấc Ca Lao Động</div>
                <div class="chat-schedule-item mb-2">
                    <strong class="text-primary"><i class="fas fa-sun text-warning me-1"></i>Ca Sáng: 07h00 - 10h30</strong>
                    <div class="small text-muted mt-1">• Có mặt điểm danh lúc <strong>06h45 - 07h00</strong>.</div>
                </div>
                <div class="chat-schedule-item mb-2">
                    <strong class="text-primary"><i class="fas fa-cloud-sun text-info me-1"></i>Ca Chiều: 13h30 - 17h00</strong>
                    <div class="small text-muted mt-1">• Có mặt điểm danh lúc <strong>13h15 - 13h30</strong>.</div>
                </div>
                <div class="small text-secondary">
                    👕 <strong>Trang phục:</strong> Áo đồng phục/thể dục, quần dài, mang giày quai hậu hoặc thể thao.
                </div>
            </div>
        `;
        addChatMessage(timeHtml, "bot", true);
    }

    // 4. Trả lời Hướng dẫn điểm danh
    function replyAttendanceGuide() {
        const attHtml = `
            <div>
                <div class="fw-bold text-info mb-1"><i class="fas fa-qrcode me-1"></i>Hướng Dẫn Điểm Danh Lao Động</div>
                <ol class="ps-3 small text-dark mb-2" style="line-height: 1.5;">
                    <li>Vào mục menu <strong>Điểm Danh Lao Động</strong>.</li>
                    <li>Sử dụng camera quét <strong>mã QR</strong> của cán bộ phụ trách hoặc nhập <strong>mã PIN</strong> buổi trực.</li>
                    <li>Điểm danh đủ <strong>2 lần</strong>: Đầu ca và Cuối ca để được tính trọn vẹn buổi trực.</li>
                </ol>
                <div class="text-end">
                    <a href="/Student/StudentCheckDay/Index" class="btn btn-sm btn-info text-white py-0 px-2 small" style="font-size: 11px;">
                        <i class="fas fa-camera me-1"></i>Đến trang Điểm Danh
                    </a>
                </div>
            </div>
        `;
        addChatMessage(attHtml, "bot", true);
    }

    // 5. Trả lời Điều kiện nhận Giấy xác nhận
    function replyCertificateGuide() {
        const certHtml = `
            <div>
                <div class="fw-bold text-danger mb-1"><i class="fas fa-certificate me-1"></i>Giấy Xác Nhận Hoàn Thành Lao Động</div>
                <div class="small text-dark mb-2">
                    🎓 <strong>Điều kiện cấp:</strong> Sinh viên phải hoàn thành tối thiểu <strong>18 ngày/buổi</strong> lao động công ích trong chương trình học.
                </div>
                <div class="chat-progress-card small text-secondary mb-2">
                    Sau khi đủ 18 buổi, hệ thống sẽ mở tính năng in/tải <strong>Giấy Chứng Nhận Hoàn Thành Nghĩa Vụ Lao Động</strong> tại mục Thống Kê.
                </div>
                <div class="text-end">
                    <a href="/Student/StudentTK/Index" class="btn btn-sm btn-outline-danger py-0 px-2 small" style="font-size: 11px;">
                        <i class="fas fa-print me-1"></i>Kiểm tra điều kiện in giấy
                    </a>
                </div>
            </div>
        `;
        addChatMessage(certHtml, "bot", true);
    }

    // 6. Trả lời Hướng dẫn đăng ký / hủy ca
    function replyRegisterGuide() {
        const regHtml = `
            <div>
                <div class="fw-bold text-success mb-1"><i class="fas fa-clipboard-list me-1"></i>Hướng Dẫn Đăng Ký Ca Lao Động</div>
                <ul class="ps-3 small text-dark mb-2" style="line-height: 1.5;">
                    <li>Vào mục <strong>Đăng Ký Lao Động</strong>.</li>
                    <li>Chọn đợt lao động đang mở còn chỉ tiêu trống.</li>
                    <li>Nhấn nút <strong>Đăng ký</strong> (theo lớp hoặc cá nhân).</li>
                    <li><em>Lưu ý:</em> Bạn có thể hủy ca trước ngày diễn ra ít nhất 24 giờ.</li>
                </ul>
                <div class="text-end">
                    <a href="/Student/StudentRegisterWord/Index" class="btn btn-sm btn-success py-0 px-2 small" style="font-size: 11px;">
                        <i class="fas fa-arrow-right me-1"></i>Đến trang Đăng Ký
                    </a>
                </div>
            </div>
        `;
        addChatMessage(regHtml, "bot", true);
    }

    // Bộ xử lý trí tuệ nhân tạo nhận diện câu hỏi
    function handleBotReply(originalMsg) {
        const msg = removeVietnameseTones(originalMsg);

        // Chào hỏi
        if (msg.includes("xin chao") || msg.includes("hello") || msg.includes("hi") || msg.includes("chao bot") || msg.includes("chao ban")) {
            addChatMessage("👋 Chào bạn! Rất vui được hỗ trợ bạn. Bạn cần tra cứu tiến độ, lịch trực hay quy định lao động?", "bot", true);
            return;
        }

        // Tiến độ / Số ngày
        if (
            msg.includes("tien do") || 
            msg.includes("bao nhieu ngay") || 
            msg.includes("da lam bao nhieu") || 
            msg.includes("so ngay") || 
            msg.includes("ngay cong") ||
            msg.includes("hoan thanh") ||
            msg.includes("con thieu bao nhieu")
        ) {
            fetchCompletedDays();
            return;
        }

        // Lịch trực / Lịch lao động
        if (
            msg.includes("lich truc") || 
            msg.includes("lich lao dong") || 
            msg.includes("da dang ky") || 
            msg.includes("sap toi") || 
            msg.includes("ngay mai") ||
            msg.includes("khi nao lam") ||
            msg.includes("ca truc")
        ) {
            fetchUpcomingSchedule();
            return;
        }

        // Giờ giấc / Thời gian / Quy định
        if (
            msg.includes("gio") || 
            msg.includes("thoi gian") || 
            msg.includes("may gio") || 
            msg.includes("quy dinh") || 
            msg.includes("trang phuc") || 
            msg.includes("ca sang") || 
            msg.includes("ca chieu")
        ) {
            replyTimeRegulations();
            return;
        }

        // Điểm danh / QR code / PIN
        if (
            msg.includes("diem danh") || 
            msg.includes("qr") || 
            msg.includes("ma pin") || 
            msg.includes("quet ma") || 
            msg.includes("check in")
        ) {
            replyAttendanceGuide();
            return;
        }

        // Giấy xác nhận / Chứng nhận
        if (
            msg.includes("giay xac nhan") || 
            msg.includes("chung nhan") || 
            msg.includes("chung chi") || 
            msg.includes("in giay") || 
            msg.includes("18 ngay") ||
            msg.includes("dieu kien")
        ) {
            replyCertificateGuide();
            return;
        }

        // Đăng ký / Hủy ca
        if (
            msg.includes("dang ky") || 
            msg.includes("huy ca") || 
            msg.includes("chon ca") || 
            msg.includes("them ca")
        ) {
            replyRegisterGuide();
            return;
        }

        // Khiếu nại / Liên hệ
        if (msg.includes("lien he") || msg.includes("ho tro") || msg.includes("khieu nai") || msg.includes("so dien thoai")) {
            const contactHtml = `
                <div>
                    <div class="fw-bold text-dark mb-1"><i class="fas fa-headset text-primary me-1"></i>Hỗ Trợ Sinh Viên</div>
                    <div class="small text-secondary mb-1">• <strong>Phòng Công tác sinh viên & Quản trị thiết bị</strong></div>
                    <div class="small text-secondary mb-1">• <strong>Địa điểm:</strong> Tòa nhà Điều hành - ĐH Đồng Tháp</div>
                    <div class="small text-secondary">• <strong>Hotline/Email:</strong> ctsv@dthu.edu.vn</div>
                </div>
            `;
            addChatMessage(contactHtml, "bot", true);
            return;
        }

        // Fallback câu trả lời mặc định nếu không khớp
        const fallbackHtml = `
            <div>
                <div class="mb-1">🤖 Xin lỗi, mình chưa hiểu rõ câu hỏi <em>"${originalMsg}"</em>.</div>
                <div class="small text-muted mb-2">Bạn có thể chọn các chủ đề nhanh dưới đây:</div>
                <div class="d-flex flex-wrap gap-1">
                    <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2 small chat-fallback-btn" data-query="Tiến độ lao động của tôi" style="font-size: 11px;">📊 Xem tiến độ</button>
                    <button type="button" class="btn btn-sm btn-outline-success py-0 px-2 small chat-fallback-btn" data-query="Lịch lao động tôi đã đăng ký" style="font-size: 11px;">📅 Lịch sắp tới</button>
                    <button type="button" class="btn btn-sm btn-outline-warning py-0 px-2 small text-dark chat-fallback-btn" data-query="Quy định ca trực và giờ giấc" style="font-size: 11px;">⏰ Quy định ca</button>
                    <button type="button" class="btn btn-sm btn-outline-info py-0 px-2 small chat-fallback-btn" data-query="Hướng dẫn cách điểm danh" style="font-size: 11px;">📱 Điểm danh</button>
                </div>
            </div>
        `;
        addChatMessage(fallbackHtml, "bot", true);

        // Gắn sự kiện cho các nút gợi ý trong fallback
        setTimeout(() => {
            const fallbackBtns = chatMessages.querySelectorAll(".chat-fallback-btn");
            fallbackBtns.forEach(btn => {
                btn.addEventListener("click", function () {
                    const q = this.getAttribute("data-query");
                    if (q) {
                        addChatMessage(q, "user", false);
                        setTimeout(() => handleBotReply(q), 300);
                    }
                });
            });
        }, 100);
    }

    // Khởi tạo Chatbot và sự kiện
    if (chatBubble && chatBox && closeChat && sendChat && chatInput && chatMessages) {

        // Mở khung chat
        chatBubble.addEventListener("click", () => {
            chatBox.style.display = "block";
            chatInput.focus();

            if (!chatMessages.hasChildNodes() || chatMessages.children.length === 0) {
                showWelcomeMessage();
            }
        });

        // Đóng khung chat
        closeChat.addEventListener("click", () => {
            chatBox.style.display = "none";
        });

        // Nút reset làm mới cuộc trò chuyện
        if (resetChat) {
            resetChat.addEventListener("click", () => {
                showWelcomeMessage();
            });
        }

        // Xử lý gửi tin nhắn
        function sendMessage() {
            const msg = chatInput.value.trim();
            if (!msg) return;

            addChatMessage(msg, "user", false);
            chatInput.value = "";

            setTimeout(() => {
                handleBotReply(msg);
            }, 300);
        }

        sendChat.addEventListener("click", sendMessage);

        chatInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
            }
        });

        // Sự kiện bấm vào các chip gợi ý nhanh bên dưới
        if (chatSuggestionsBar) {
            const chips = chatSuggestionsBar.querySelectorAll(".chat-chip");
            chips.forEach(chip => {
                chip.addEventListener("click", function () {
                    const query = this.getAttribute("data-query");
                    if (query) {
                        addChatMessage(query, "user", false);
                        setTimeout(() => {
                            handleBotReply(query);
                        }, 300);
                    }
                });
            });
        }
    }



    
});
