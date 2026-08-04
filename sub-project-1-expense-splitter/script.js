// ---- State ----
let people = [];      // ["Alice", "Bob"]
let expenses = [];     // [{ id, name, amount, payer }]

// ---- Elements ----
const personForm = document.getElementById('person-form');
const personInput = document.getElementById('person-input');
const peopleList = document.getElementById('people-list');

const expenseForm = document.getElementById('expense-form');
const expenseName = document.getElementById('expense-name');
const expenseAmount = document.getElementById('expense-amount');
const expensePayer = document.getElementById('expense-payer');
const expenseListEl = document.getElementById('expense-list');

const totalAmountEl = document.getElementById('total-amount');
const settleListEl = document.getElementById('settle-list');

// ---- People ----
personForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = personInput.value.trim();
  if (!name || people.includes(name)) return;
  people.push(name);
  personInput.value = '';
  renderPeople();
  renderPayerOptions();
  renderSettlement();
});

function removePerson(name) {
  people = people.filter(p => p !== name);
  expenses = expenses.filter(exp => exp.payer !== name);
  renderPeople();
  renderPayerOptions();
  renderExpenses();
  renderSettlement();
}

function renderPeople() {
  peopleList.innerHTML = '';
  people.forEach(name => {
    const li = document.createElement('li');
    li.className = 'tag';
    li.innerHTML = `<span>${escapeHtml(name)}</span>`;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', `Remove ${name}`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removePerson(name));
    li.appendChild(removeBtn);
    peopleList.appendChild(li);
  });
}

function renderPayerOptions() {
  expensePayer.innerHTML = '';
  if (people.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'Add people first';
    opt.disabled = true;
    opt.selected = true;
    expensePayer.appendChild(opt);
    return;
  }
  people.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `Paid by ${name}`;
    expensePayer.appendChild(opt);
  });
}

// ---- Expenses ----
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = expenseName.value.trim();
  const amount = parseFloat(expenseAmount.value);
  const payer = expensePayer.value;
  if (!name || !payer || isNaN(amount) || amount <= 0) return;

  expenses.push({ id: crypto.randomUUID(), name, amount, payer });
  expenseName.value = '';
  expenseAmount.value = '';
  renderExpenses();
  renderSettlement();
});

function removeExpense(id) {
  expenses = expenses.filter(exp => exp.id !== id);
  renderExpenses();
  renderSettlement();
}

function renderExpenses() {
  expenseListEl.innerHTML = '';
  expenses.forEach(exp => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="exp-name">${escapeHtml(exp.name)}<br><span class="exp-payer">paid by ${escapeHtml(exp.payer)}</span></span>
      <span class="exp-amount">$${exp.amount.toFixed(2)}</span>
    `;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', `Remove ${exp.name}`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeExpense(exp.id));
    li.appendChild(removeBtn);
    expenseListEl.appendChild(li);
  });
}

// ---- Settlement math ----
// Every expense is split evenly across all current people.
// Balance = (amount paid) - (fair share of all expenses).
function renderSettlement() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  totalAmountEl.textContent = `$${total.toFixed(2)}`;

  settleListEl.innerHTML = '';

  if (people.length === 0 || expenses.length === 0) {
    const li = document.createElement('li');
    li.className = 'settle-empty';
    li.textContent = 'Add people and items to see who owes what.';
    settleListEl.appendChild(li);
    return;
  }

  const fairShare = total / people.length;
  const balances = {}; // positive = is owed money, negative = owes money
  people.forEach(p => { balances[p] = -fairShare; });
  expenses.forEach(exp => {
    if (balances[exp.payer] !== undefined) {
      balances[exp.payer] += exp.amount;
    }
  });

  // Greedy settle: match biggest debtor with biggest creditor
  const debtors = [];
  const creditors = [];
  Object.entries(balances).forEach(([name, bal]) => {
    if (bal < -0.005) debtors.push({ name, amount: -bal });
    else if (bal > 0.005) creditors.push({ name, amount: bal });
  });
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    transactions.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < 0.005) i++;
    if (creditors[j].amount < 0.005) j++;
  }

  if (transactions.length === 0) {
    const li = document.createElement('li');
    li.className = 'settle-empty';
    li.textContent = "Everyone's even. Nice.";
    settleListEl.appendChild(li);
    return;
  }

  transactions.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span><span class="settle-owe">${escapeHtml(t.from)}</span> → <span class="settle-owed">${escapeHtml(t.to)}</span></span>
      <span>$${t.amount.toFixed(2)}</span>
    `;
    settleListEl.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Init ----
renderPeople();
renderPayerOptions();
renderExpenses();
renderSettlement();
