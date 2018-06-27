
// ==================
//  Helper Functions
// ==================

const onDocumentReady = (fn) => {
	const hasDOMLoaded = (document.attachEvent ?
		document.readyState === "complete" :
		document.readyState !== "loading"
	);

	if (hasDOMLoaded) {
		fn();
	} else {
		document.addEventListener('DOMContentLoaded', fn);
	}
};

const delegateEvent = (element, eventName, selector, handler) => {
	element.addEventListener(eventName, (event) => {
		if (event.target && event.target.matches(selector)) {
			handler(event);
		}
	});
};


// =======================
//  Data-Relative Classes
// =======================

const { LocalStorageDataBase, Task } = (() => {

	//  LocalStorage interaction class
	// --------------------------------

	class LocalStorageDataBase {
		constructor(namespace) {
			this.namespace = namespace;
		}

		loadData() {
			return JSON.parse(localStorage.getItem(this.namespace));
		}

		saveData(data) {
			localStorage.setItem(this.namespace, JSON.stringify(data));
		}
	}


	//  Task Data Class
	// -----------------

	let TaskIdCounter = 0;
	const getNextTaskId = () => TaskIdCounter++;

	class Task {
		constructor(text, isDone) {
			this.text     = text;
			this.id       = getNextTaskId();
			this.isDone   = !!isDone;
		}

		static parse({ text, isDone }) {
			return new Task(text, isDone);
		}
	}

	// "export"
	return {
		LocalStorageDataBase,
		Task,
	};
})();


// ===========================
//  Task List Interface (API)
// ===========================

const taskListInterface = (() => {
	const dataBase   = new LocalStorageDataBase('simpleDB');
	const storedData = dataBase.loadData();
	const taskList   = storedData ? storedData.map(Task.parse) : [];

	const isValidId = (taskId) => (
		typeof taskId === 'string' ||
		typeof taskId === 'number'
	);

	// GET Method
	const getData = (taskId) => {
		if (typeof taskId === 'undefined') {
			return taskList;
		}

		// 400 Error
		if (!isValidId(taskId)) {
			throw new TypeError('Invalid task ID');
		}

		const foundTask = taskList.find((task) => task.id == taskId);

		// 404 Error
		if (!foundTask) {
			throw new ReferenceError('Task not found');
		}

		return foundTask;
	};

	// POST Method
	const addItem = (data) => {
		const task = (data instanceof Task) ? data : Task.parse(data);

		taskList.push(task);
		dataBase.saveData(taskList);
	};

	// PUT Method
	const updateItem = (taskId, data) => {
		// 400 Error
		if (!isValidId(taskId)) {
			throw new TypeError('Invalid task ID');
		}

		const taskIndex = taskList.findIndex((task) => task.id == taskId);

		// 404 Error
		if (taskIndex === -1) {
			throw new ReferenceError('Task not found');
		}

		const targetTask = taskList[taskIndex];

		// TODO: Add validation for "protected" attributes like ID
		Object.keys(targetTask).forEach((key) => {

			if (
				typeof data[key] === 'undefined' ||
				data[key] === targetTask[key]
			) {
				return;
			}

			targetTask[key] = data[key];
		});

		dataBase.saveData(taskList);
	};

	// DELETE Method
	const deleteItem = (taskId) => {
		// 400 Error
		if (!isValidId(taskId)) {
			throw new TypeError('Invalid task ID');
		}

		const taskIndex = taskList.findIndex((task) => task.id == taskId);

		// 404 Error
		if (taskIndex === -1) {
			throw new ReferenceError('Task not found');
		}

		taskList.splice(taskIndex, 1);
		dataBase.saveData(taskList);
	};

	return {
		get: getData,
		add: addItem,
		update: updateItem,
		delete: deleteItem,
	}
})();


// ======================
//  DOM-Relative Classes
// ======================

const { SimpleForm, SimpleList } = (() => {

	//  Simple Form
	// -------------

	class SimpleForm {
		constructor(selector) {
			if (typeof selector !== 'string' || selector === '') {
				throw new TypeError(`'${selector}' is not a valid selector.`);
			}

			this._selector = selector;

			this.DOM = {
				form: null,
				input: null,
			};

			this.classes = {
				validityChecked: 'was-validated'
			};
		}

		init() {
			this.updateElementReferences();

			this.addEventListeners();
		}

		updateElementReferences() {
			const formElement = document.querySelector(this._selector);

			if (!formElement) {
				throw new ReferenceError('Form element not found');
			}

			this.DOM.form = formElement;

			const inputElement = this.DOM.form.querySelector('[name=task-text]');

			if (!inputElement) {
				throw new ReferenceError('Input element not found');
			}

			this.DOM.input = inputElement;
		}

		addEventListeners() {
			this.DOM.form.addEventListener('submit', (event) => {
				event.preventDefault();
				event.stopPropagation();

				this.validate();
			});
		}

		validate() {
			this.DOM.form.classList.add(this.classes.validityChecked);

			if (!this.DOM.form.checkValidity()) {
				return;
			}

			this.submit(this.DOM.input.value);
		}

		submit(data) {
			this.DOM.form.dispatchEvent(
				new CustomEvent('validSubmit', {
					detail: { formData: data }
				})
			);

			this.reset();
		}

		reset() {
			this.DOM.form.classList.remove(this.classes.validityChecked);
			this.DOM.form.reset();
		}
	}

	const simpleTemplateRender = (template, context) => {
		const isValidValue = (value) => (
			typeof value !== 'undefined' &&
			value !== null
		);

		return template.replace(
			/{{([^]*?)}}/g,
			(originalString, key) => (isValidValue(context[key]) ? context[key] : originalString)
		);
	};


	//  Simple List
	// -------------

	class SimpleList {
		constructor(selector) {
			if (typeof selector !== 'string' || selector === '') {
				throw new TypeError(`'${selector}' is not a valid selector.`);
			}

			this._selector = selector;
			this.DOM = {
				list: null,
			};
		}

		init() {
			this.updateElementReferences();
		}

		updateElementReferences() {
			const listElement = document.querySelector(this._selector);

			if (!listElement) {
				throw new ReferenceError('List element not found');
			}

			this.DOM.list = listElement;
		}

		add(template, context) {
			const renderedHTML = simpleTemplateRender(template, context);

			this.DOM.list.innerHTML += renderedHTML;

			this.DOM.list.dispatchEvent(
				new CustomEvent('itemAdded', {
					detail: {
						itemId: context.id,
						renderedHTML,
					}
				})
			);
		}

		remove(itemId) {
			const targetItem = this.DOM.list.querySelector(`[data-id="${itemId}"]`);

			if (!targetItem) {
				throw new ReferenceError(`No elements with data-id="${itemId}".`);
			}

			this.DOM.list.removeChild(targetItem);

			this.DOM.list.dispatchEvent(
				new CustomEvent('itemRemoved', {
					detail: { itemId }
				})
			);
		}
	}

	// "export"
	return {
		SimpleForm,
		SimpleList,
	};
})();


// =============
//  Application
// =============

class SimpleTodo {
	constructor () {
		// Create DOM interacting instances
		this.taskForm = new SimpleForm('[data-is=task-form]');
		this.taskList = new SimpleList('[data-is=task-list]');

		this.templates = {
			task: null,
		};
	}

	init() {
		this.taskForm.init();
		this.taskList.init();

		this.getTemplates();

		const storedData = taskListInterface.get();

		// Add stored tasks
		if (!!storedData) {
			storedData.forEach((task) => {
				this.taskList.add(
					this.templates.task,
					this.getTaskContext(task),
				);
			});
		}

		this.addEventListeners();
	}

	getTemplates() {
		const taskTemplate = document.getElementById('task-template');

		if (!taskTemplate) {
			throw new ReferenceError('Task template element was not found');
		}

		this.templates.task = taskTemplate.innerHTML;
	}

	getTaskContext(task) {
		return {
			text: task.text,
			id: task.id,
			isDoneClass: task.isDone ? 'task-complete' : '',
		};
	}

	addEventListeners() {
		this.taskForm.DOM.form.addEventListener('validSubmit', (event) => {
			if (!(event instanceof Event)) {
				throw new TypeError('This function must be bound to an EventListener');
			}

			this.addTask(new Task(event.detail.formData, false));
		});

		delegateEvent(this.taskList.DOM.list, 'click', '[data-action=remove]', (event) => {
			if (!(event instanceof Event)) {
				throw new TypeError('This function must be bound to an EventListener');
			}

			event.preventDefault();
			event.stopPropagation();

			this.removeTask(event.target.parentNode.getAttribute('data-id'));
		});

		delegateEvent(this.taskList.DOM.list, 'click', '.task', (event) => {
			if (!(event instanceof Event)) {
				throw new TypeError('This function must be bound to an EventListener');
			}

			event.preventDefault();
			event.stopPropagation();

			const targetElement = event.target;
			const taskId  = targetElement.getAttribute('data-id');
			const wasDone = targetElement.classList.contains('task-complete');

			this.updateTaskCompletion(taskId, !wasDone);
		});
	}

	addTask(newTask) {
		// API -> POST
		taskListInterface.add(newTask);

		// Update DOM
		this.taskList.add(
			this.templates.task,
			this.getTaskContext(newTask)
		);
	}

	removeTask(taskId) {
		// API -> DELETE
		taskListInterface.delete(taskId);

		// Update DOM
		this.taskList.remove(taskId);
	}

	updateTaskCompletion(taskId, isDone) {
		// API -> PUT
		taskListInterface.update(taskId, { isDone });

		// Update DOM
		const targetElement = this.taskList.DOM.list.querySelector(`[data-id="${taskId}"]`);

		if (!targetElement) {
			throw new ReferenceError(`No elements with data-id="${taskId}".`);
		}

		targetElement.classList[isDone ? 'add' : 'remove']('task-complete');
	}
}

// Create singleton instance
const simpleTodo = new SimpleTodo();

// Init application when DOM has loaded
onDocumentReady(() => {
	simpleTodo.init();
});
