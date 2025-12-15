
    document.addEventListener("DOMContentLoaded", function () {
    // ===== TOAST HIỆU ỨNG CHẠY + THANH TIẾN TRÌNH =====
    const toastEl = document.querySelector('.toast');
    if (toastEl) {
        const toast = new bootstrap.Toast(toastEl, {delay: 5000 }); // hiển thị 5 giây
    toast.show();

    // Thanh tiến trình chạy từ 100% -> 0%
    const progressBar = toastEl.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.transition = "width 5s linear";
    progressBar.style.width = "0%";
        }

        // Hiệu ứng slide out khi hết thời gian
        setTimeout(() => {
        toastEl.style.animation = "slideOutUp 0.7s forwards";
            setTimeout(() => toastEl.remove(), 700);
        }, 5000);

    // Click nút đóng để ẩn ngay
    const closeBtn = toastEl.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toastEl.style.animation = "slideOutUp 0.5s forwards";
            setTimeout(() => toastEl.remove(), 500);
        });
        }
    }

    // ===== DROPDOWN MENU =====
    const userMenu = document.getElementById('userMenu');
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (userMenu && dropdownMenu) {
        userMenu.addEventListener('click', function (event) {
            event.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    document.addEventListener('click', function (event) {
            if (!userMenu.contains(event.target)) {
        dropdownMenu.classList.remove('show');
            }
        });
    }

    // ===== BONG BÓNG CHAT =====
    const chatBubble = document.getElementById("chatBubble");
    const chatBox = document.getElementById("chatBox");
    const closeChat = document.getElementById("closeChat");
    const sendChat = document.getElementById("sendChat");
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");

    if (chatBubble && chatBox && closeChat && sendChat && chatInput && chatMessages) {
        chatBubble.addEventListener("click", () => { chatBox.style.display = "block"; });
        closeChat.addEventListener("click", () => {chatBox.style.display = "none"; });
        sendChat.addEventListener("click", () => {
            const msg = chatInput.value.trim();
    if (msg) {
                const div = document.createElement("div");
    div.className = "text-end text-primary mb-2";
    div.textContent = msg;
    chatMessages.appendChild(div);
    chatInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        });
    chatInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter") sendChat.click();
        });
    }
});

