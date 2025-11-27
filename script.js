// State
let teachers = [];

// DOM Elements
const teacherList = document.getElementById('teacher-list');
const addTeacherBtn = document.getElementById('add-teacher-btn');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('close-modal');
const addTeacherForm = document.getElementById('add-teacher-form');
const confettiCanvas = document.getElementById('confetti-canvas');

// Constants
const STORAGE_KEY = 'teacher_rage_rank_data';
const MAX_HISTORY = 50;
const CONFETTI_THRESHOLD = 40;

// Confetti setup
const ctx = confettiCanvas.getContext('2d');
confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderTeachers();
});

// Event Listeners
addTeacherBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
});

closeModal.addEventListener('click', hideModal);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        hideModal();
    }
});

addTeacherForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const subject = document.getElementById('subject').value;
    const color = document.querySelector('input[name="color"]:checked').value;

    addTeacher(name, subject, color);
    addTeacherForm.reset();
    hideModal();
});

// Functions

function hideModal() {
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        teachers = JSON.parse(data);
    } else {
        // Default data
        teachers = [
            {
                id: Date.now(),
                name: 'M. Dupont',
                subject: 'Mathématiques',
                color: 'red',
                score: 42,
                lastSavedScore: 42,
                history: [{ timestamp: Date.now(), score: 42 }]
            }
        ];
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
}

function addTeacher(name, subject, color) {
    const newTeacher = {
        id: Date.now(),
        name,
        subject,
        color,
        score: 0,
        lastSavedScore: 0,
        history: [{ timestamp: Date.now(), score: 0 }]
    };
    teachers.push(newTeacher);
    saveData();
    renderTeachers();
}

function deleteTeacher(id) {
    const teacher = teachers.find(t => t.id === id);
    if (!teacher) return;

    showConfirmModal(
        `Êtes-vous sûr de vouloir supprimer <strong>${teacher.name}</strong> (${teacher.subject}) ?`,
        () => {
            teachers = teachers.filter(t => t.id !== id);
            saveData();
            renderTeachers();
        }
    );
}

function showConfirmModal(message, onConfirm) {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmDelete = document.getElementById('confirm-delete');
    const confirmCancel = document.getElementById('confirm-cancel');

    confirmMessage.innerHTML = message;
    confirmModal.classList.remove('hidden');
    setTimeout(() => confirmModal.classList.add('visible'), 10);

    // Remove old listeners
    const newConfirmDelete = confirmDelete.cloneNode(true);
    const newConfirmCancel = confirmCancel.cloneNode(true);
    confirmDelete.parentNode.replaceChild(newConfirmDelete, confirmDelete);
    confirmCancel.parentNode.replaceChild(newConfirmCancel, confirmCancel);

    // Add new listeners
    newConfirmDelete.addEventListener('click', () => {
        onConfirm();
        hideConfirmModal();
    });

    newConfirmCancel.addEventListener('click', hideConfirmModal);
}

function hideConfirmModal() {
    const confirmModal = document.getElementById('confirm-modal');
    confirmModal.classList.remove('visible');
    setTimeout(() => confirmModal.classList.add('hidden'), 300);
}

function updateScore(id, change) {
    const teacher = teachers.find(t => t.id === id);
    if (teacher) {
        const oldScore = teacher.score;
        teacher.score += change;
        if (teacher.score < 0) teacher.score = 0;

        // Check if crossed threshold
        if (oldScore < CONFETTI_THRESHOLD && teacher.score >= CONFETTI_THRESHOLD) {
            triggerConfetti();
        }

        saveData();
        // Only update the card, don't re-render (no re-sorting until save)
        updateTeacherCard(teacher);
    }
}

function shouldReorderTeachers(teacher, oldScore) {
    const currentRank = teachers.sort((a, b) => b.score - a.score).findIndex(t => t.id === teacher.id);

    // Create temp array with old score to check old rank
    const tempTeachers = teachers.map(t => t.id === teacher.id ? { ...t, score: oldScore } : t);
    const oldRank = tempTeachers.sort((a, b) => b.score - a.score).findIndex(t => t.id === teacher.id);

    return currentRank !== oldRank;
}

function updateTeacherCard(teacher) {
    const card = document.querySelector(`[data-teacher-id="${teacher.id}"]`);
    if (!card) return;

    // Update score display
    const scoreValue = card.querySelector('.score-value');
    if (scoreValue) {
        scoreValue.textContent = teacher.score;
    }

    // Update save button state
    const saveBtn = card.querySelector('.save-btn');
    const hasChanges = teacher.score !== teacher.lastSavedScore;
    if (saveBtn) {
        saveBtn.disabled = !hasChanges;
        saveBtn.innerHTML = hasChanges ? '💾 Sauvegarder' : '✓ Sauvegardé';
    }
}

function saveScore(id) {
    const teacher = teachers.find(t => t.id === id);
    if (teacher && teacher.score !== teacher.lastSavedScore) {
        teacher.lastSavedScore = teacher.score;
        teacher.history.push({
            timestamp: Date.now(),
            score: teacher.score
        });

        // Limit history
        if (teacher.history.length > MAX_HISTORY) {
            teacher.history.shift();
        }

        saveData();

        // Re-render to update sorting and medals based on new saved scores
        renderTeachers();
    }
}

function getMedalEmoji(rank) {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return '';
}

function getRankByScore(teacher, allTeachers) {
    // Get unique SAVED scores in descending order
    const scores = [...new Set(allTeachers.map(t => t.lastSavedScore))].sort((a, b) => b - a);
    const scoreRank = scores.indexOf(teacher.lastSavedScore);
    return scoreRank;
}

function renderTeachers() {
    teacherList.innerHTML = '';

    // Empty state
    if (teachers.length === 0) {
        teacherList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎓</div>
                <h2>Aucun prof pour le moment</h2>
                <p>Cliquez sur le bouton <strong>+</strong> pour ajouter votre premier prof à surveiller !</p>
            </div>
        `;
        return;
    }

    // Sort teachers by SAVED score (descending)
    teachers.sort((a, b) => b.lastSavedScore - a.lastSavedScore);

    teachers.forEach((teacher, index) => {
        const card = document.createElement('div');
        card.className = 'teacher-card';
        card.setAttribute('data-teacher-id', teacher.id);
        card.style.setProperty('--card-color', `var(--color-${teacher.color})`);

        const rank = getRankByScore(teacher, teachers);
        const medal = rank < 3 ? `<div class="medal">${getMedalEmoji(rank)}</div>` : '';
        const hasChanges = teacher.score !== teacher.lastSavedScore;

        card.innerHTML = `
            ${medal}
            <div class="card-header">
                <div class="teacher-info">
                    <h3>${teacher.name}</h3>
                    <p>${teacher.subject}</p>
                </div>
                <button class="delete-btn" onclick="deleteTeacher(${teacher.id})">&times;</button>
            </div>
            
            <div class="score-container">
                <div class="score-controls">
                    <button class="control-btn minus" onclick="updateScore(${teacher.id}, -1)">-</button>
                </div>
                <div class="score-display">
                    <span class="score-label">RAGE SCORE</span>
                    <span class="score-value" style="color: var(--color-${teacher.color})">${teacher.score}</span>
                </div>
                <div class="score-controls">
                    <button class="control-btn plus" onclick="updateScore(${teacher.id}, 1)">+</button>
                </div>
            </div>

            ${teacher.history.length >= 2 ? `
            <div class="chart-container has-chart">
                <canvas id="chart-${teacher.id}"></canvas>
            </div>
            ` : '<div class="chart-container"><div style="display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 0.9rem; height: 100%;">Sauvegardez pour voir le graphique</div></div>'}

            <button class="save-btn save-btn-${teacher.color}" onclick="saveScore(${teacher.id})" ${!hasChanges ? 'disabled' : ''}>
                ${hasChanges ? '💾 Sauvegarder' : '✓ Sauvegardé'}
            </button>
        `;

        teacherList.appendChild(card);
        if (teacher.history.length >= 2) {
            renderChart(teacher);
        }
    });
}

function updateChart(teacher) {
    const canvas = document.getElementById(`chart-${teacher.id}`);
    if (!canvas) return;

    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    renderChart(teacher);
}

function renderChart(teacher) {
    const ctx = document.getElementById(`chart-${teacher.id}`).getContext('2d');

    const colorVar = getComputedStyle(document.documentElement).getPropertyValue(`--color-${teacher.color}`).trim();

    // Format data - use score values directly
    const chartData = teacher.history.map(h => h.score);
    const labels = teacher.history.map((h, index) => {
        const date = new Date(h.timestamp);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rage',
                data: chartData,
                borderColor: colorVar,
                backgroundColor: colorVar + '33',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (items) => {
                            const index = items[0].dataIndex;
                            const date = new Date(teacher.history[index].timestamp);
                            return date.toLocaleString('fr-FR');
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false,
                    min: 0
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Confetti Animation
function triggerConfetti() {
    const particles = [];
    const particleCount = 150;
    const colors = ['#f87171', '#60a5fa', '#4ade80', '#c084fc', '#fb923c', '#fbbf24'];

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * confettiCanvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            size: Math.random() * 8 + 4
        });
    }

    function animate() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

        let stillAnimating = false;

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.rotation += p.rotationSpeed;

            if (p.y < confettiCanvas.height + 10) {
                stillAnimating = true;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        if (stillAnimating) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

// Expose functions to global scope
window.deleteTeacher = deleteTeacher;
window.updateScore = updateScore;
window.saveScore = saveScore;
