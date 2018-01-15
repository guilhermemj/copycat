const app = (() => {

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
			this.DOM.form.classList.add('was-validated');

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
			this.DOM.form.classList.remove('was-validated');
			this.DOM.form.reset();
		}
	}


	//
	//

	class TaskList {
		constructor(selector) {
			if (
				typeof selector !== 'string' ||
				selector === ''
			) throw new TypeError(`'${selector}' is not a valid selector.`);

			this._selector = selector;
			this.DOM = {};
		}

		init() {
			this.DOM.list = document.querySelector(this._selector);

			if (!this.DOM.list) throw new ReferenceError('List element not found');

			this.addEventListeners();
		}

		addEventListeners() {

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

		}

		init() {
			this.taskForm.init();
			this.taskList.init();

			this.addEventListeners();
		}

		addEventListeners() {
			this.taskForm.DOM.form.addEventListener('validSubmit', (event) => {
				const formData = event.detail;
				console.log(formData);
			});
		}
	}

	// Create app instance
	const app = new SimpleTodo();

	// Init application when DOM has loaded
	onDocumentReady(() => {
		app.init();
	});

	// Make app available globally
	return app;
})();
