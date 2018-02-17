const simpleTodo = (() => {

	//  Helper Functions
	// ------------------

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

	const elementMatchesSelector = (element, selector) => (
		(
			element.matches ||
			element.matchesSelector ||
			element.msMatchesSelector ||
			element.mozMatchesSelector ||
			element.webkitMatchesSelector ||
			element.oMatchesSelector
		).call(element, selector)
	);

	const delegateEvent = (element, eventName, selector, handler) => {
		element.addEventListener(eventName, (event) => {
			if (event.target && elementMatchesSelector(event.target, selector)) {
				handler(event);
			}
		});
	};

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


	//  Data Persistence Class
	// ------------------------

	class ModelClass {
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


	//  Task Class
	// -------------

	let TaskIdCounter = 0;
	const getNextTaskId = () => TaskIdCounter++;

	class Task {
		constructor(text, isDone) {
			this.text     = text;
			this.id       = getNextTaskId();
			this.position = 1;
			this.isDone   = !!isDone;
		}

		static parse({ text, isDone }) {
			return new Task(text, isDone);
		}
	}


	//  Task Form
	// ------------

	class TaskForm {
		constructor(selector) {
			if (
				typeof selector !== 'string' ||
				selector === ''
			) throw new TypeError(`'${selector}' is not a valid selector.`);

			this._selector = selector;
			this.DOM = {};
			this.classes = {
				validityChecked: 'was-validated'
			};
		}

		init() {
			this.DOM.form = document.querySelector(this._selector);

			if (!this.DOM.form) throw new ReferenceError('Form element not found');

			this.DOM.input = this.DOM.form.querySelector('[name=task-text]');

			if (!this.DOM.input) throw new ReferenceError('Input element not found');

			this.addEventListeners();
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

			if (!this.DOM.form.checkValidity()) return;

			this.submit(this.DOM.input.value);
		}

		submit(data) {
			this.DOM.form.dispatchEvent(
				new CustomEvent('validSubmit', { detail: data })
			);

			this.reset();
		}

		reset() {
			this.DOM.form.classList.remove(this.classes.validityChecked);
			this.DOM.form.reset();
		}
	}


	//  Task List
	// -----------

	class TaskList {
		constructor(selector) {
			if (
				typeof selector !== 'string' ||
				selector === ''
			) throw new TypeError(`'${selector}' is not a valid selector.`);

			this._selector = selector;
			this.DOM = {};
			this.classes = {
				taskComplete: 'task-complete'
			};
		}

		init() {
			this.DOM.list = document.querySelector(this._selector);

			if (!this.DOM.list) throw new ReferenceError('List element not found');

			this.addEventListeners();
		}

		addEventListeners() {
			delegateEvent(this.DOM.list, 'click', '.task', (event) => {
				event.target.classList.toggle(this.classes.taskComplete);
			});

			delegateEvent(this.DOM.list, 'click', '[data-action=remove]', (event) => {
				if (!event.target) return;

				event.preventDefault();
				event.stopPropagation();

				const taskId = event.target.parentNode.getAttribute('data-id');
				this.remove(taskId);
			});
		}

		add(task) {
			console.log(`adding task "${task.id}:${task.text}"`);

			//if (!(task instanceof Task)) throw new TypeError(`"${task}" is not a valid task.`);

			const taskTemplate = document.getElementById('task-template');

			if (!taskTemplate) throw new ReferenceError('Task template was not found');

			this.DOM.list.innerHTML += simpleTemplateRender(taskTemplate.innerHTML, task);

			this.DOM.list.dispatchEvent(
				new CustomEvent('taskAdded', { detail: task })
			);
		}

		remove(taskId) {
			const targetTask = this.DOM.list.querySelector(`[data-id="${taskId}"]`);

			if (!targetTask) throw new ReferenceError(`No elements with taskId = ${taskId}.`);

			this.DOM.list.removeChild(targetTask);

			this.DOM.list.dispatchEvent(
				new CustomEvent('taskRemoved', { detail: taskId })
			);
		}
	}


	//  Application Class
	// --------------------

	class SimpleTodo {
		constructor () {
			this.taskForm = new TaskForm('[data-is=task-form]');
			this.taskList = new TaskList('[data-is=task-list]');

			// Create DB instance
			this.simpleDB = new ModelClass('simpleDB');

			this.data = { list: [] };
		}

		init() {
			this.taskForm.init();
			this.taskList.init();

			this.addEventListeners();
		}

		addEventListeners() {
			this.taskForm.DOM.form.addEventListener('validSubmit', (event) => {
				const formData = event.detail;

				console.log(`Text "${formData}" submited`);
				this.taskList.add(new Task(formData, false));
			});

			this.taskList.DOM.list.addEventListener('taskAdded', (event) => {
				const task = event.detail;

				console.log(`Task "${task.id}:${task.text}" added`);
			});

			this.taskList.DOM.list.addEventListener('taskRemoved', (event) => {
				const taskId = event.detail;

				console.log(`Task ${taskId} removed`);
			});
		}
	}

	// Create singleton instance
	const singleton = new SimpleTodo();

	// Init application when DOM has loaded
	onDocumentReady(() => {
		singleton.init();
	});

	// Make it available globally
	return singleton;
})();
