const STORAGE_KEY = "riri-habit-state-v1";
const icons = ["水", "步", "书", "眠", "心", "练", "果", "记"];
const colors = ["#1e8a65", "#e06c55", "#d3a22f", "#4f83c2", "#8a68ae", "#d45d88"];
const surprises = [
  ["两分钟挑战", "站起来伸个懒腰，再慢慢喝一杯水。"],
  ["今日问题", "如果今天只做好一件事，你会选什么？"],
  ["小小冒险", "走一条平时不会走的路，留意三个新细节。"],
  ["放松许可", "今晚可以理直气壮地留 20 分钟什么都不做。"],
  ["感官任务", "闭上眼睛听完一首歌，中途不碰手机。"],
  ["温柔提醒", "进度慢也算前进。今天不需要向任何人证明什么。"],
  ["微小整理", "只整理手边一平方米，完成就停。"],
  ["稀有卡片", "给未来的自己留一句明天会想看到的话。"]
];
const bonusSurprises = ["奖励：今天完成一件小事后，就允许自己早点收工。", "隐藏任务：给一个很久没联系的人发句问候。", "幸运掉落：去吃一样你真正喜欢的小东西。", "彩蛋：拍下今天最顺眼的一束光。"];

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const seed = {
  habits: [
    { id: makeId(), name: "喝够八杯水", icon: "水", color: colors[0], createdAt: dateKey(new Date(Date.now() - 8 * 86400000)) },
    { id: makeId(), name: "阅读 20 分钟", icon: "书", color: colors[3], createdAt: dateKey(new Date(Date.now() - 8 * 86400000)) },
    { id: makeId(), name: "走路 6000 步", icon: "步", color: colors[2], createdAt: dateKey(new Date(Date.now() - 8 * 86400000)) },
    { id: makeId(), name: "十二点前睡觉", icon: "眠", color: colors[4], createdAt: dateKey(new Date(Date.now() - 8 * 86400000)) }
  ],
  checks: {},
  goals: [],
  theme: "light"
};

let state = loadState();
let calendarCursor = new Date();
let selectedIcon = icons[0];
let selectedColor = colors[0];
let currentGoalFilter = "all";

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved?.habits) return createSeed();
    saved.goals ||= [];
    return saved;
  } catch { return createSeed(); }
}

function createSeed() {
  const copy = structuredClone(seed);
  for (let offset = 1; offset <= 7; offset++) {
    const key = dateKey(new Date(Date.now() - offset * 86400000));
    copy.checks[key] = copy.habits.filter((_, index) => (index + offset) % 4 !== 0).map(habit => habit.id);
  }
  return copy;
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function checkedFor(key) { return state.checks[key] || []; }
function isChecked(habitId, key = dateKey(new Date())) { return checkedFor(key).includes(habitId); }

function render() {
  document.body.classList.toggle("dark", state.theme === "dark");
  document.querySelector("#themeToggle span").textContent = state.theme === "dark" ? "☀" : "☾";
  renderToday();
  renderWeek();
  renderCalendar();
  renderManage();
  renderGoals();
}

function renderToday() {
  const now = new Date();
  const today = dateKey(now);
  const done = checkedFor(today).filter(id => state.habits.some(habit => habit.id === id));
  const percent = state.habits.length ? Math.round(done.length / state.habits.length * 100) : 0;
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  document.querySelector("#fullDate").textContent = `${now.getMonth() + 1}月${now.getDate()}日 · ${weekdays[now.getDay()]}`;
  document.querySelector("#greeting").textContent = hourGreeting(now.getHours());
  document.querySelector("#progressPercent").textContent = `${percent}%`;
  document.querySelector("#dailyRing").style.setProperty("--progress", `${percent * 3.6}deg`);
  document.querySelector("#doneCount").textContent = done.length;
  document.querySelector("#bestStreak").textContent = calculateBestStreak();
  document.querySelector("#weekRate").textContent = `${calculateWeekRate()}%`;
  const list = document.querySelector("#habitList");
  list.innerHTML = state.habits.map(habit => {
    const doneToday = done.includes(habit.id);
    return `<article class="habit-card ${doneToday ? "done" : ""}" style="--habit-color:${habit.color}">
      <div class="habit-icon" aria-hidden="true">${habit.icon}</div>
      <div class="habit-copy"><h3>${escapeHtml(habit.name)}</h3><p>${habitStreak(habit.id)} 天连续 · 今天${doneToday ? "已完成" : "待完成"}</p></div>
      <button class="check-button" data-check="${habit.id}" aria-label="${doneToday ? "取消" : "完成"}${escapeHtml(habit.name)}" title="${doneToday ? "取消打卡" : "打卡"}">✓</button>
    </article>`;
  }).join("");
  document.querySelector("#todayEmpty").hidden = state.habits.length > 0;
  renderDelight(today, done.length);
}

function renderDelight(today, doneCount) {
  renderFocusGoal();
  return;
  const dayNumber = Number(today.replaceAll("-", ""));
  const surprise = surprises[dayNumber % surprises.length];
  const opened = state.mysteryOpened === today;
  const bonusOpened = state.bonusOpened === today;
  const card = document.querySelector("#mysteryCard");
  card.classList.toggle("opened", opened);
  document.querySelector("#mysteryType").textContent = surprise[0];
  document.querySelector("#mysteryText").textContent = surprise[1];
  document.querySelector("#rarityTag").textContent = surprise[0] === "稀有卡片" ? "稀有掉落" : "今日限定";
  const openButton = document.querySelector("#openMystery");
  openButton.textContent = opened ? "今天的盲盒已拆开" : "拆开今天的小惊喜";
  openButton.disabled = opened;
  const bonusButton = document.querySelector("#openBonus");
  bonusButton.hidden = !opened;
  bonusButton.disabled = bonusOpened;
  bonusButton.textContent = bonusOpened ? bonusSurprises[dayNumber % bonusSurprises.length] : doneCount ? "打开打卡奖励卡" : "完成任意一次打卡，解锁奖励卡";
  bonusButton.dataset.locked = doneCount ? "false" : "true";

  renderFocusGoal();
}

function renderFocusGoal() {
  const panel = document.querySelector("#focusPanel");
  const activeGoals = (state.goals || []).filter(goal => !goal.completed).sort((a, b) => a.deadline.localeCompare(b.deadline));
  if (!activeGoals.length) {
    panel.innerHTML = `<div class="delight-top"><div><p class="eyebrow">TODAY'S DIRECTION</p><h2>今日推进</h2></div></div><div class="focus-empty"><strong>还没有正在进行的目标</strong><p>写下想改变或学会的事，让每天的行动有方向。</p><button class="primary-button" data-open-goal>创建一个目标</button></div>`;
    return;
  }
  const goal = activeGoals[0];
  const percent = Math.min(100, Math.round(goal.progress / goal.target * 100));
  const days = Math.ceil((new Date(`${goal.deadline}T23:59:59`) - new Date()) / 86400000);
  panel.innerHTML = `<div class="delight-top"><div><p class="eyebrow">TODAY'S DIRECTION</p><h2>今日推进</h2></div><span>${days < 0 ? "已到期" : `剩 ${days} 天`}</span></div><h3 class="focus-goal-title">${escapeHtml(goal.title)}</h3><p class="focus-goal-why">${escapeHtml(goal.why)}</p><div class="focus-progress-label"><span>${goal.progress}/${goal.target} 次行动</span><strong>${percent}%</strong></div><div class="focus-progress"><i style="width:${percent}%"></i></div><div class="focus-actions"><button class="primary-button" data-goal-quick="${goal.id}">完成一次行动</button><button class="secondary-button" data-goal-details>详情</button></div>`;
}

function hourGreeting(hour) {
  if (hour < 6) return "夜深了，记得照顾自己";
  if (hour < 11) return "早上好，今天也稳稳向前";
  if (hour < 14) return "中午好，给自己一点余裕";
  if (hour < 18) return "下午好，继续保持节奏";
  return "晚上好，为今天轻轻收尾";
}

function renderWeek() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const labels = ["一", "二", "三", "四", "五", "六", "日"];
  let total = 0;
  document.querySelector("#weekChart").innerHTML = labels.map((label, index) => {
    const date = new Date(monday); date.setDate(monday.getDate() + index);
    const count = checkedFor(dateKey(date)).filter(id => state.habits.some(h => h.id === id)).length;
    total += count;
    const height = state.habits.length ? Math.max(3, count / state.habits.length * 100) : 3;
    return `<div class="bar-column ${dateKey(date) === dateKey(today) ? "today" : ""}"><div class="bar-track" title="${count} 次完成"><div class="bar-fill" style="height:${height}%"></div></div><span>${label}</span></div>`;
  }).join("");
  document.querySelector("#weekSummary").textContent = `${total} 次完成`;
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  document.querySelector("#calendarTitle").textContent = `${year}年 ${month + 1}月`;
  const first = new Date(year, month, 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  document.querySelector("#calendarGrid").innerHTML = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart); date.setDate(gridStart.getDate() + index);
    const key = dateKey(date);
    const checks = checkedFor(key).filter(id => state.habits.some(h => h.id === id));
    const classes = ["calendar-day"];
    if (date.getMonth() !== month) classes.push("muted");
    if (checks.length) classes.push("has-data");
    if (state.habits.length && checks.length >= state.habits.length) classes.push("complete");
    if (key === dateKey(new Date())) classes.push("today");
    return `<div class="${classes.join(" ")}" title="${key} · ${checks.length} 次完成">${date.getDate()}</div>`;
  }).join("");
}

function renderManage() {
  const list = document.querySelector("#manageList");
  if (!state.habits.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-visual"><span>✓</span></div><h3>还没有习惯</h3><p>添加一件你愿意每天做的小事。</p><button class="primary-button" data-open-add>添加习惯</button></div>`;
    return;
  }
  list.innerHTML = state.habits.map(habit => `<article class="manage-item habit-reminder-item" style="--habit-color:${habit.color}">
    <div class="habit-icon">${habit.icon}</div><div class="manage-habit-copy"><h3>${escapeHtml(habit.name)}</h3><p>累计完成 ${habitTotal(habit.id)} 次 · 最长连续 ${habitBestStreak(habit.id)} 天</p>
    <div class="habit-reminder-controls"><label>开始<input type="time" value="${habit.reminderStart || "20:00"}" data-reminder-start="${habit.id}"></label><span>至</span><label>结束<input type="time" value="${habit.reminderEnd || "21:00"}" data-reminder-end="${habit.id}"></label><button class="secondary-button" data-habit-calendar="${habit.id}">加入日历</button></div></div>
    <button class="delete-button" data-delete="${habit.id}">删除</button></article>`).join("");
}

function toggleCheck(id) {
  const key = dateKey(new Date());
  const checks = new Set(checkedFor(key));
  const adding = !checks.has(id);
  adding ? checks.add(id) : checks.delete(id);
  state.checks[key] = [...checks];
  saveState(); render();
  showToast(adding ? "打卡成功，今天又向前一步" : "已取消今天的打卡");
}

function openMystery() {
  const today = dateKey(new Date());
  state.mysteryOpened = today;
  saveState(); render(); showToast("今日盲盒已打开");
}

function openBonus() {
  const button = document.querySelector("#openBonus");
  if (button.dataset.locked === "true") { showToast("先完成任意一次打卡，就能解锁"); return; }
  state.bonusOpened = dateKey(new Date());
  saveState(); render(); showToast("发现一张隐藏奖励卡");
}

function habitStreak(id) {
  let streak = 0;
  const cursor = new Date();
  if (!isChecked(id, dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (isChecked(id, dateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

function habitBestStreak(id) {
  const dates = Object.keys(state.checks).filter(key => state.checks[key].includes(id)).sort();
  let best = 0, current = 0, previous = null;
  dates.forEach(key => {
    const date = new Date(`${key}T12:00:00`);
    current = previous && Math.round((date - previous) / 86400000) === 1 ? current + 1 : 1;
    best = Math.max(best, current); previous = date;
  });
  return best;
}

function calculateBestStreak() { return Math.max(0, ...state.habits.map(h => habitBestStreak(h.id))); }
function habitTotal(id) { return Object.values(state.checks).filter(ids => ids.includes(id)).length; }
function calculateWeekRate() {
  if (!state.habits.length) return 0;
  const today = new Date();
  const dayIndex = (today.getDay() + 6) % 7;
  let checks = 0;
  for (let i = 0; i <= dayIndex; i++) { const d = new Date(today); d.setDate(today.getDate() - dayIndex + i); checks += checkedFor(dateKey(d)).filter(id => state.habits.some(h => h.id === id)).length; }
  return Math.round(checks / (state.habits.length * (dayIndex + 1)) * 100);
}

function openDialog() {
  selectedIcon = icons[0]; selectedColor = colors[0];
  document.querySelector("#habitForm").reset(); renderOptions();
  document.querySelector("#habitDialog").showModal();
  setTimeout(() => document.querySelector("#habitName").focus(), 50);
}

function renderOptions() {
  document.querySelector("#iconOptions").innerHTML = icons.map(icon => `<button type="button" class="option-button ${icon === selectedIcon ? "selected" : ""}" data-icon="${icon}" aria-label="图标 ${icon}">${icon}</button>`).join("");
  document.querySelector("#colorOptions").innerHTML = colors.map(color => `<button type="button" class="option-button ${color === selectedColor ? "selected" : ""}" style="--option-color:${color}" data-color="${color}" aria-label="选择颜色 ${color}"></button>`).join("");
}

function addHabit() {
  const input = document.querySelector("#habitName");
  const name = input.value.trim();
  if (!name) { input.reportValidity(); return; }
  const reminderStart = document.querySelector("#habitReminderStart").value || "20:00";
  const reminderEnd = document.querySelector("#habitReminderEnd").value || "21:00";
  state.habits.push({ id: makeId(), name, icon: selectedIcon, color: selectedColor, reminderStart, reminderEnd, createdAt: dateKey(new Date()) });
  saveState(); render(); document.querySelector("#habitDialog").close(); showToast("新习惯已加入今天的清单");
}

function deleteHabit(id) {
  const habit = state.habits.find(item => item.id === id);
  if (!habit || !confirm(`删除“${habit.name}”？历史打卡记录也会一并清除。`)) return;
  state.habits = state.habits.filter(item => item.id !== id);
  Object.keys(state.checks).forEach(key => state.checks[key] = state.checks[key].filter(item => item !== id));
  saveState(); render(); showToast("习惯已删除");
}

function addCalendarReminder() {
  const timeInput = document.querySelector("#reminderTime");
  const time = timeInput.value || "20:30";
  state.reminderTime = time;
  saveState();
  const [hours, minutes] = time.split(":").map(Number);
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  if (start <= new Date()) start.setDate(start.getDate() + 1);
  const end = new Date(start.getTime() + 5 * 60000);
  const formatCalendarDate = date => {
    const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
    return `${parts[0]}${String(parts[1]).padStart(2, "0")}${String(parts[2]).padStart(2, "0")}T${String(parts[3]).padStart(2, "0")}${String(parts[4]).padStart(2, "0")}${String(parts[5]).padStart(2, "0")}`;
  };
  const pageUrl = location.href.split("#")[0];
  const calendar = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Riri Habit//Daily Reminder//CN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${makeId()}@riri-habit`, `DTSTART:${formatCalendarDate(start)}`, `DTEND:${formatCalendarDate(end)}`,
    "RRULE:FREQ=DAILY", "SUMMARY:打开日日，完成今天的打卡", `DESCRIPTION:轻轻完成今天的一件事。打开：${pageUrl}`,
    "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:该打卡啦", "END:VALARM", "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `日日打卡-${time.replace(":", "")}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast("提醒文件已生成，请选择用日历打开");
}

function goalDeadline(period, from = new Date()) {
  const date = new Date(from);
  if (period === "week") date.setDate(date.getDate() + (7 - ((date.getDay() + 6) % 7)) - 1);
  if (period === "month") date.setMonth(date.getMonth() + 1, 0);
  if (period === "year") date.setMonth(11, 31);
  date.setHours(23, 59, 59, 999);
  return dateKey(date);
}

function renderGoals() {
  const goals = state.goals || [];
  const visible = currentGoalFilter === "all" ? goals : goals.filter(goal => goal.period === currentGoalFilter);
  document.querySelector("#activeGoalCount").textContent = goals.filter(goal => !goal.completed).length;
  document.querySelector("#goalActionCount").textContent = goals.reduce((sum, goal) => sum + goal.progress, 0);
  document.querySelector("#completedGoalCount").textContent = goals.filter(goal => goal.completed).length;
  document.querySelector("#goalEmpty").hidden = visible.length > 0;
  const periodNames = { week: "一周目标", month: "月度目标", year: "年度目标" };
  const now = dateKey(new Date());
  document.querySelector("#goalList").innerHTML = visible.map(goal => {
    const percent = Math.min(100, Math.round(goal.progress / goal.target * 100));
    const overdue = !goal.completed && goal.deadline < now;
    return `<article class="goal-card ${goal.completed ? "completed" : ""}">
      <div class="goal-card-top"><span class="period-tag">${periodNames[goal.period]}</span><span class="goal-due ${overdue ? "overdue" : ""}">${goal.completed ? "已完成" : overdue ? "已到期" : `截止 ${goal.deadline.slice(5).replace("-", "/")}`}</span></div>
      <h3>${escapeHtml(goal.title)}</h3><p class="goal-why">${escapeHtml(goal.why)}</p>
      <div class="goal-progress-line"><span>行动进度</span><strong>${percent}%</strong></div><div class="goal-progress-bar"><i style="width:${percent}%"></i></div>
      <div class="goal-card-actions"><div class="goal-stepper"><button data-goal-minus="${goal.id}" aria-label="减少一次行动">−</button><span>${goal.progress}/${goal.target}</span><button data-goal-plus="${goal.id}" aria-label="完成一次行动">＋</button></div><button class="delete-button" data-goal-delete="${goal.id}">删除</button></div>
    </article>`;
  }).join("");
}

function openGoalDialog() {
  document.querySelector("#goalForm").reset();
  document.querySelector("#goalTarget").value = 12;
  document.querySelector("#goalDialog").showModal();
  setTimeout(() => document.querySelector("#goalTitle").focus(), 50);
}

function addGoal() {
  const titleInput = document.querySelector("#goalTitle");
  const whyInput = document.querySelector("#goalWhy");
  const title = titleInput.value.trim(); const why = whyInput.value.trim();
  if (!title || !why) { (!title ? titleInput : whyInput).reportValidity(); return; }
  const period = document.querySelector("#goalPeriod").value;
  const target = Math.max(1, Number(document.querySelector("#goalTarget").value) || 1);
  state.goals.push({ id: makeId(), title, why, period, target, progress: 0, completed: false, createdAt: dateKey(new Date()), deadline: goalDeadline(period) });
  saveState(); render(); document.querySelector("#goalDialog").close(); showToast("目标已开始，先完成第一次行动吧");
}

function changeGoalProgress(id, amount) {
  const goal = state.goals.find(item => item.id === id); if (!goal) return;
  goal.progress = Math.max(0, Math.min(goal.target, goal.progress + amount));
  const justCompleted = !goal.completed && goal.progress >= goal.target;
  goal.completed = goal.progress >= goal.target;
  saveState(); render(); showToast(justCompleted ? "目标完成了，这一步很值得记住" : amount > 0 ? "记下一次行动" : "已调整行动次数");
}

function deleteGoal(id) {
  const goal = state.goals.find(item => item.id === id);
  if (!goal || !confirm(`删除目标“${goal.title}”？`)) return;
  state.goals = state.goals.filter(item => item.id !== id); saveState(); render(); showToast("目标已删除");
}

function formatCalendarDate(date) {
  const values = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  return `${values[0]}${String(values[1]).padStart(2, "0")}${String(values[2]).padStart(2, "0")}T${String(values[3]).padStart(2, "0")}${String(values[4]).padStart(2, "0")}${String(values[5]).padStart(2, "0")}`;
}

function downloadHabitReminder(habit) {
  const startTime = habit.reminderStart || "20:00"; const endTime = habit.reminderEnd || "21:00";
  const [startHour, startMinute] = startTime.split(":").map(Number); const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = new Date(); start.setHours(startHour, startMinute, 0, 0); if (start <= new Date()) start.setDate(start.getDate() + 1);
  const end = new Date(start); end.setHours(endHour, endMinute, 0, 0); if (end <= start) end.setDate(end.getDate() + 1);
  const calendar = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Riri Habit//Habit Reminder//CN", "BEGIN:VEVENT", `UID:${makeId()}@riri-habit`, `DTSTART:${formatCalendarDate(start)}`, `DTEND:${formatCalendarDate(end)}`, "RRULE:FREQ=DAILY", `SUMMARY:${habit.name}`, `DESCRIPTION:打开日日，完成：${habit.name}`, "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", `DESCRIPTION:该完成 ${habit.name} 了`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" }); const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = `${habit.name}-每日提醒.ics`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast("任务提醒已生成，请选择用日历打开");
}

function updateHabitReminder(id, field, value) {
  const habit = state.habits.find(item => item.id === id); if (!habit) return;
  habit[field] = value; saveState(); renderToday(); showToast("提醒时段已保存");
}

function switchView(view) {
  document.querySelectorAll(".view.mobile-inline").forEach(item => item.classList.remove("mobile-inline"));
  document.querySelectorAll("[data-mobile-panel]").forEach(item => item.setAttribute("aria-expanded", "false"));
  document.querySelectorAll(".view").forEach(item => item.classList.toggle("active", item.id === `${view}View`));
  document.querySelectorAll(".nav-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMobilePanel(view) {
  const target = document.querySelector(`#${view}View`);
  const trigger = document.querySelector(`[data-mobile-panel="${view}"]`);
  const wasOpen = target.classList.contains("mobile-inline");
  document.querySelectorAll(".view.mobile-inline").forEach(item => item.classList.remove("mobile-inline"));
  document.querySelectorAll("[data-mobile-panel]").forEach(item => item.setAttribute("aria-expanded", "false"));
  if (wasOpen) return;
  target.classList.remove("active");
  target.classList.add("mobile-inline");
  trigger.setAttribute("aria-expanded", "true");
  setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
}

function showToast(message) {
  const toast = document.querySelector("#toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }

document.addEventListener("click", event => {
  const target = event.target.closest("button"); if (!target) return;
  if (target.dataset.view) switchView(target.dataset.view);
  if (target.dataset.mobilePanel) toggleMobilePanel(target.dataset.mobilePanel);
  if (target.hasAttribute("data-goal-details")) window.innerWidth <= 700 ? toggleMobilePanel("goals") : switchView("goals");
  if (target.dataset.check) toggleCheck(target.dataset.check);
  if (target.dataset.delete) deleteHabit(target.dataset.delete);
  if (target.hasAttribute("data-open-goal")) openGoalDialog();
  if (target.dataset.goalPlus) changeGoalProgress(target.dataset.goalPlus, 1);
  if (target.dataset.goalQuick) changeGoalProgress(target.dataset.goalQuick, 1);
  if (target.dataset.goalMinus) changeGoalProgress(target.dataset.goalMinus, -1);
  if (target.dataset.goalDelete) deleteGoal(target.dataset.goalDelete);
  if (target.dataset.goalFilter) { currentGoalFilter = target.dataset.goalFilter; document.querySelectorAll("[data-goal-filter]").forEach(item => item.classList.toggle("active", item === target)); renderGoals(); }
  if (target.dataset.habitCalendar) { const habit = state.habits.find(item => item.id === target.dataset.habitCalendar); if (habit) downloadHabitReminder(habit); }
  if (target.hasAttribute("data-open-add") || target.id === "quickAddButton") openDialog();
  if (target.dataset.icon) { selectedIcon = target.dataset.icon; renderOptions(); }
  if (target.dataset.color) { selectedColor = target.dataset.color; renderOptions(); }
});

document.querySelector("#saveHabit").addEventListener("click", event => { event.preventDefault(); addHabit(); });
document.querySelector("#habitForm").addEventListener("submit", event => { event.preventDefault(); addHabit(); });
document.querySelector("#saveGoal").addEventListener("click", event => { event.preventDefault(); addGoal(); });
document.querySelector("#goalForm").addEventListener("submit", event => { event.preventDefault(); addGoal(); });
document.querySelector("#goalPeriod").addEventListener("change", event => {
  const presets = { week: [5, "建议：一周目标拆成 3–7 次清晰行动。"], month: [12, "建议：一个月目标拆成 8–20 次可以完成的行动。"], year: [52, "建议：一年目标按每周一次行动开始。"] };
  document.querySelector("#goalTarget").value = presets[event.target.value][0]; document.querySelector("#goalHint").textContent = presets[event.target.value][1];
});
document.addEventListener("change", event => {
  if (event.target.dataset.reminderStart) updateHabitReminder(event.target.dataset.reminderStart, "reminderStart", event.target.value);
  if (event.target.dataset.reminderEnd) updateHabitReminder(event.target.dataset.reminderEnd, "reminderEnd", event.target.value);
});
document.querySelector("#themeToggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; saveState(); render(); });
document.querySelector("#reminderTime").value = state.reminderTime || "20:30";
document.querySelector("#reminderTime").addEventListener("change", event => { state.reminderTime = event.target.value; saveState(); });
document.querySelector("#addCalendarReminder").addEventListener("click", addCalendarReminder);
document.querySelector("#prevMonth").addEventListener("click", () => { calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderCalendar(); });
document.querySelector("#nextMonth").addEventListener("click", () => { calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderCalendar(); });

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js");
render();
