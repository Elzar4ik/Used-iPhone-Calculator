document.addEventListener("DOMContentLoaded", function () {
    fetch('models.json')
        .then(response => response.json())
        .then(data => {
            const modelSelect = document.getElementById('model');
            const memorySelect = document.getElementById('memory');
            const sortSelect = document.getElementById('sort');

            // Функція для оновлення моделей у select
            function updateModels(models) {
                modelSelect.innerHTML = '<option value="">Оберіть модель</option>';
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });
            }

            // Сортуємо моделі за типами: основна версія -> mini -> pro -> pro max
            let sortedModels = data.models.sort((a, b) => compareModels(a.name, b.name));

            // Оновлюємо список моделей за замовчуванням
            updateModels(sortedModels);

            // Додаємо функціонал для сортування (від новіших до старіших або навпаки)
            sortSelect.addEventListener('change', function () {
                const sortOrder = sortSelect.value;

                if (sortOrder === 'newest') {
                    sortedModels = data.models.sort((a, b) => compareModels(a.name, b.name)); // Від новіших до старіших
                } else if (sortOrder === 'oldest') {
                    sortedModels = data.models.sort((a, b) => compareModels(b.name, a.name)); // Від старіших до новіших
                }

                updateModels(sortedModels); // Оновлюємо моделі після сортування
            });

            // Коли обирається модель
            modelSelect.addEventListener('change', function () {
                const selectedModel = modelSelect.value;
                memorySelect.innerHTML = '<option value="">Оберіть пам\'ять</option>'; // Очищуємо старі опції

                // Завантажуємо пам'ять для вибраної моделі
                const memoryOptions = data.models.find(model => model.name === selectedModel).memory;
                memoryOptions.forEach(mem => {
                    const option = document.createElement('option');
                    option.value = mem.price;
                    option.textContent = `${mem.size} GB - ${mem.price} дол.`;
                    memorySelect.appendChild(option);
                });

                // Завантажуємо ремонти для вибраної моделі
                loadRepairOptions(selectedModel);
            });
        });

    document.getElementById('add-repair').addEventListener('click', addRepairRow);
});

let repairCount = 0;
let selectedRepairs = [];

function compareModels(a, b) {
    const regex = /(\d+)\s?(mini|pro max|pro)?/i;
    const aMatch = a.match(regex);
    const bMatch = b.match(regex);

    if (!aMatch || !bMatch) return 0;

    // Порівняння номерів моделей (12, 13, 14 тощо)
    const aVersion = parseInt(aMatch[1]);
    const bVersion = parseInt(bMatch[1]);

    if (aVersion !== bVersion) return bVersion - aVersion;

    // Впорядковуємо типи моделей в порядку: основна версія -> mini -> pro -> pro max
    const order = ['', 'mini', 'pro', 'pro max'];
    const aType = aMatch[2]?.toLowerCase() || '';
    const bType = bMatch[2]?.toLowerCase() || '';

    return order.indexOf(aType) - order.indexOf(bType);
}

function loadRepairOptions(model) {
    fetch('models.json')
        .then(response => response.json())
        .then(data => {
            const availableRepairs = data.models.find(m => m.name === model).repairs;

            // Оновлюємо всі випадаючі списки ремонту
            const repairSelects = document.querySelectorAll('.repair-row select');
            repairSelects.forEach(select => {
                // Зберігаємо поточно вибраний елемент (щоб після оновлення зберегти його)
                const currentSelectedRepair = select.value;

                // Очищаємо старі опції
                select.innerHTML = '<option value="">Оберіть ремонт</option>';

                // Для кожного ремонту додаємо нову опцію
                for (const repair in availableRepairs) {
                    const option = document.createElement('option');
                    option.value = availableRepairs[repair]; // Ціна ремонту
                    option.textContent = `${repair} - ${availableRepairs[repair]} дол.`;
                    select.appendChild(option);
                }

                // Відновлюємо попередньо вибрану опцію, якщо вона існує
                select.value = currentSelectedRepair || '';
            });
        });
}

function addRepairRow() {
    repairCount++;
    const repairSection = document.getElementById('repair-section');

    // Створюємо новий рядок для вибору ремонту
    const repairRow = document.createElement('div');
    repairRow.classList.add('repair-row');

    const select = document.createElement('select');
    select.id = `repair-${repairCount}`;
    select.addEventListener('change', updateRepairSelection);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Видалити ремонт';
    removeButton.addEventListener('click', function () {
        repairSection.removeChild(repairRow);
        const selectedRepairText = select.options[select.selectedIndex]?.text.split(' - ')[0];
        selectedRepairs = selectedRepairs.filter(item => item !== selectedRepairText);
        updateAllRepairSelects();
    });

    repairRow.appendChild(select);
    repairRow.appendChild(removeButton);
    repairSection.appendChild(repairRow);

    // Завантажуємо опції ремонту для нової моделі
    loadRepairOptions(document.getElementById('model').value);
}

function updateRepairSelection(event) {
    const selectedRepairText = event.target.options[event.target.selectedIndex].text.split(' - ')[0];

    // Перевіряємо, чи вже додано цей ремонт
    if (!selectedRepairs.includes(selectedRepairText)) {
        selectedRepairs.push(selectedRepairText);
    }
    updateAllRepairSelects();
}

function updateAllRepairSelects() {
    const allRepairSelects = document.querySelectorAll('.repair-row select');
    
    // Переконуємось, що всі опції залишаються доступними для кожного select
    allRepairSelects.forEach(select => {
        const currentValue = select.value; // Зберігаємо вибрану опцію
        loadRepairOptions(document.getElementById('model').value); // Завантажуємо опції
        select.value = currentValue; // Після завантаження залишаємо обраний варіант
    });
}

function calculatePrice() {
    const model = document.getElementById('model').value;
    const memoryPrice = parseFloat(document.getElementById('memory').value);
    const condition = parseFloat(document.getElementById('condition').value);
    const currency = document.getElementById('currency').value;
    const dollarRate = parseFloat(document.getElementById('dollar-rate').value);
    const markup = -100;
    let totalRepairCost = 0;

    // Обчислюємо загальну вартість ремонтів
    const allRepairSelects = document.querySelectorAll('.repair-row select');
    allRepairSelects.forEach(select => {
        totalRepairCost += parseFloat(select.value);
    });

    const conditionCoefficient = condition / 10;
    let finalPrice = (memoryPrice * conditionCoefficient) + markup - totalRepairCost;

    if (currency === 'UAH') {
        finalPrice = finalPrice * dollarRate;
        totalRepairCost = totalRepairCost * dollarRate;
    }

    let repairCostDisplay = currency === 'UAH' ? totalRepairCost : totalRepairCost;

    document.getElementById('result').innerHTML = `
        <h2>Остаточна вартість</h2>
        <p>Модель: ${model}</p>
        <p>Стан: ${condition}/10</p>
        <p>Вартість ремонту: ${repairCostDisplay.toFixed(2)} ${currency === 'UAH' ? 'грн' : 'дол.'}</p>
        <p>Остаточна ціна: ${finalPrice.toFixed(2)} ${currency}</p>
    `;
}