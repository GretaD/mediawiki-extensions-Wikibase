( function( mw, wb, $ ) {
	'use strict';

	var PARENT = $.ui.TemplatedWidget;

/**
 * View for displaying and editing `wikibase.datamodel.Reference` objects.
 * @see wikibase.datamodel.Reference
 * @class jQuery.wikibase.referenceview
 * @extends jQuery.ui.TemplatedWidget
 * @since 0.4
 * @licence GNU GPL v2+
 * @author H. Snater < mediawiki@snater.com >
 *
 * @constructor
 *
 * @param {Object} options
 * @param {wikibase.datamodel.Reference|null} options.value
 * @param {jQuery.wikibase.listview.ListItemAdapater} options.listItemAdapter
 * @param {wikibase.entityChangers.ReferencesChanger} options.referencesChanger
 *        Required for saving the `Reference` represented by the widget instance.
 * @param {string|null} [options.statementGuid]
 *        The GUID of the `Statement` the `Reference` represented by the widget instance belongs to.
 * @param {string} [options.helpMessage=mw.msg( 'wikibase-claimview-snak-new-tooltip' )]
 *        End-user message explaining how to interact with the widget. The message is most likely to
 *        be used inside the tooltip of the toolbar corresponding to the widget.
 */
/**
 * @event afterstartediting
 * Triggered after having started the widget's edit mode and edit mode has been rendered.
 * @param {jQuery.Event} event
 */
/**
 * @event stopediting
 * Triggered when stopping the widget's edit mode, immediately before re-drawing.
 * @param {jQuery.Event} event
 * @param {boolean} dropValue
 *        Whether the widget's value will be reset to the one from before starting edit mode.
 */
/**
 * @event afterstopediting
 * Triggered after having stopped the widget's edit mode and non-edit mode is redrawn.
 * @param {boolean} dropValue
 *        Whether the widget's value has been be reset to the one from before starting edit mode.
 */
/**
 * @event change
 * Triggered whenever the `Reference` represented by the widget is changed.
 * @param {jQuery.Event} event
 */
/**
 * @event toggleerror
 * Triggered when an error occurred or has been resolved.
 * @param {jQuery.Event} event
 * @param {wikibase.api.RepoApiError|undefined} RepoApiError
 *        Object if an error occurred, `undefined` if the current error state is resolved.
 */
$.widget( 'wikibase.referenceview', PARENT, {
	/**
	 * @inheritdoc
	 */
	options: {
		template: 'wikibase-referenceview',
		templateParams: [
			'', // additional css classes
			'' // snaklistview widget
		],
		templateShortCuts: {
			$listview: '.wikibase-referenceview-listview'
		},
		value: null,
		listItemAdapter: null,
		referencesChanger: null,
		statementGuid: null,
		helpMessage: mw.msg( 'wikibase-claimview-snak-new-tooltip' )
	},

	/**
	 * Whether the widget is currently in edit mode.
	 * @property {boolean} [_isInEditMode=false]
	 * @private
	 */
	_isInEditMode: false,

	/**
	 * @inheritdoc
	 * @protected
	 *
	 * @throws {Error} if a required option is not specified properly.
	 */
	_create: function() {
		if ( !this.options.listItemAdapter || !this.options.referencesChanger ) {
			throw new Error( 'Required option not specified properly' );
		}

		PARENT.prototype._create.call( this );

		this.$listview.listview( {
			listItemAdapter: this.options.listItemAdapter,
			value: this.options.value ? this.options.value.getSnaks().getGroupedSnakLists() : []
		} );

		this._updateReferenceHashClass( this.value() );
	},

	/**
	 * Attaches event listeners needed during edit mode.
	 * @private
	 */
	_attachEditModeEventHandlers: function() {
		var self = this,
			listview = this.$listview.data( 'listview' ),
			lia = listview.listItemAdapter();

		var changeEvents = [
			'snakviewchange.' + this.widgetName,
			lia.prefixedEvent( 'change.' + this.widgetName ),
			'listviewafteritemmove.' + this.widgetName,
			'listviewitemadded.' + this.widgetName,
			'listviewitemremoved.' + this.widgetName
		];

		this.$listview
		.on( changeEvents.join( ' ' ), function( event ) {
			if ( event.type === 'listviewitemremoved' ) {
				// Check if last snaklistview item (snakview) has been removed and remove the
				// listview item (the snaklistview itself) if so:
				var $snaklistview = $( event.target ).closest( ':wikibase-snaklistview' ),
					snaklistview = lia.liInstance( $snaklistview );

				if ( snaklistview && !snaklistview.value().length ) {
					listview.removeItem( $snaklistview );
				}
			}

			// Propagate "change" event.
			self._trigger( 'change' );
		} )
		.one( lia.prefixedEvent( 'stopediting.' + this.widgetName ),
			function( event, dropValue ) {
				event.stopPropagation();
				event.preventDefault();
				self.stopEditing( dropValue );
		} );
	},

	/**
	 * Detaches the event handlers needed during edit mode.
	 * @private
	 */
	_detachEditModeEventHandlers: function() {
		var lia = this.$listview.data( 'listview' ).listItemAdapter(),
			events = [
				'snakviewchange.' + this.widgetName,
				'listviewafteritemmove.' + this.widgetName,
				'listviewitemadded.' + this.widgetName,
				'listviewitemremoved.' + this.widgetName,
				lia.prefixedEvent( 'change.' + this.widgetName ),
				lia.prefixedEvent( 'stopediting.' + this.widgetName )
			];
		this.$listview.off( events.join( ' ' ) );
	},

	/**
	 * Will update the `wb-reference-<hash>` CSS class on the widget's root element to a given
	 * `Reference`'s hash. If `null` is given or if the `Reference` has no hash, `wb-reference-new`
	 * will be added as class.
	 * @private
	 *
	 * @param {wikibase.datamodel.Reference|null} reference
	 */
	_updateReferenceHashClass: function( reference ) {
		var refHash = reference && reference.getHash() || 'new';

		this.element.removeClassByRegex( /wb-reference-.+/ );
		this.element.addClass( 'wb-reference-' + refHash );

		this.element.removeClassByRegex( new RegExp( this.widgetBaseClass + '-.+' ) );
		this.element.addClass( this.widgetBaseClass + '-' + refHash );
	},

	/**
	 * Sets the `Reference` to be represented by the view or returns the `Reference` currently
	 * represented by the widget.
	 *
	 * @param {wikibase.datamodel.Reference|null} [reference]
	 * @return {wikibase.datamodel.Reference|null|undefined}
	 */
	value: function( reference ) {
		if ( reference ) {
			return this.option( 'value', reference );
		}

		if ( !this.$listview ) {
			return null;
		}

		var snakList = new wb.datamodel.SnakList();

		$.each( this.$listview.data( 'listview' ).value(), function() {
			snakList.merge( this.value() );
		} );

		if ( this.options.value || snakList.length ) {
			return new wb.datamodel.Reference(
				snakList,
				this.options.value ? this.options.value.getHash() : undefined
			);
		}

		return null;
	},

	/**
	 * Starts the widget's edit mode.
	 * @since 0.5
	 */
	startEditing: function() {
		if ( this.isInEditMode() ) {
			return;
		}

		$.each( this.$listview.data( 'listview' ).value(), function() {
			this.startEditing();
		} );

		this._attachEditModeEventHandlers();

		this.element.addClass( 'wb-edit' );
		this._isInEditMode = true;

		this._trigger( 'afterstartediting' );
	},

	/**
	 * Stops the widget's edit mode.
	 * @since 0.5
	 */
	stopEditing: function( dropValue ) {
		if ( !this.isInEditMode() || ( !this.isValid() || this.isInitialValue() ) && !dropValue ) {
			return;
		}

		this._trigger( 'stopediting', null, [dropValue] );

		var self = this;

		this.element.removeClass( 'wb-error' );
		this._detachEditModeEventHandlers();
		this.disable();

		if ( dropValue ) {
			this._stopEditingReferenceSnaks();

			this.enable();
			this.element.removeClass( 'wb-edit' );
			this._isInEditMode = false;

			this._trigger( 'afterstopediting', null, [ dropValue ] );
		} else {
			this._saveReferenceApiCall()
			.done( function( savedReference ) {
				self.options.value = savedReference;

				self._stopEditingReferenceSnaks();

				self.enable();

				self.element.removeClass( 'wb-edit' );
				self._isInEditMode = false;

				self._trigger( 'afterstopediting', null, [ dropValue ] );
			} )
			.fail( function( error ) {
				self.enable();

				self._attachEditModeEventHandlers();
				self.setError( error );
			} );
		}
	},

	/**
	 * Cancels edit mode.
	 * @since 0.5
	 */
	cancelEditing: function() {
		this.stopEditing( true );
	},

	/**
	 * @private
	 */
	_stopEditingReferenceSnaks: function() {
		var listview = this.$listview.data( 'listview' );

		listview.items().each( function() {
			listview.removeItem( $( this ) );
		} );

		if ( this.options.value ) {
			$.each( this.options.value.getSnaks().getGroupedSnakLists(), function() {
				listview.addItem( this );
			} );
		}
	},

	/**
	 * Returns whether the widget is currently in edit mode.
	 * @since 0.5
	 *
	 * @return {boolean}
	 */
	isInEditMode: function() {
		return this._isInEditMode;
	},

	/**
	 * Returns whether the widget (all its `snaklistview`s) is currently valid.
	 * @since 0.5
	 *
	 * @return {boolean}
	 */
	isValid: function() {
		var isValid = true;
		$.each( this.$listview.data( 'listview' ).value(), function() {
			if ( !this.isValid() ) {
				isValid = false;
			}
			return isValid;
		} );
		return isValid;
	},

	/**
	 * Returns whether the widget's current value matches the value it has been initialized with by
	 * checking the `Reference`'s `Snak`s.
	 * @since 0.5
	 *
	 * @return {boolean}
	 */
	isInitialValue: function() {
		var currentReference = this.value(),
			currentSnakList = currentReference
				? currentReference.getSnaks()
				: new wb.datamodel.SnakList();
		return currentSnakList.equals(
			this.options.value ? this.options.value.getSnaks() : new wb.datamodel.SnakList()
		);
	},

	/**
	 * Adds a pending `snaklistview` to the widget.
	 * @see jQuery.wikibase.listview.enterNewItem
	 * @since 0.5
	 *
	 * @return {Object} jQuery.Promise
	 * @return {Function} return.done
	 * @return {jQuery} return.done.$snaklistview
	 */
	enterNewItem: function() {
		var self = this,
			listview = this.$listview.data( 'listview' ),
			lia = listview.listItemAdapter();

		this.startEditing();

		return listview.enterNewItem().done( function( $snaklistview ) {
			lia.liInstance( $snaklistview ).enterNewItem()
			.done( function() {
				// Since the new snakview will be initialized empty which invalidates the
				// snaklistview, external components using the snaklistview will be noticed via
				// the "change" event.
				self._trigger( 'change' );
			} );
		} );
	},

	/**
	 * Triggers the API call to save the reference.
	 * @see wikibase.entityChangers.ReferencesChanger.setReference
	 * @private
	 *
	 * @return {Object} jQuery.Promise
	 * @return {Function} return.done
	 * @return {Reference} return.done.savedReference
	 * @return {Function} return.fail
	 * @return {wikibase.api.RepoApiError} return.fail.error
	 */
	_saveReferenceApiCall: function() {
		var self = this,
			guid = this.options.statementGuid;

		return this.options.referencesChanger.setReference( guid, this.value() )
			.done( function( savedReference ) {
			self._updateReferenceHashClass( savedReference );
		} );
	},

	/**
	 * Sets/removes error state from the widget.
	 *
	 * @param {wikibase.api.RepoApiError} [error]
	 */
	setError: function( error ) {
		if ( error ) {
			this.element.addClass( 'wb-error' );
			this._trigger( 'toggleerror', null, [ error ] );
		} else {
			this.element.removeClass( 'wb-error' );
			this._trigger( 'toggleerror' );
		}
	},

	/**
	 * @inheritdoc
	 * @protected
	 *
	 * @throws {Error} when trying to set the value to something different that a
	 *         `wikibase.datamodel.Reference` object.
	 */
	_setOption: function( key, value ) {
		if ( key === 'value' ) {
			if ( !( value instanceof wb.datamodel.Reference ) ) {
				throw new Error( 'Value has to be an instance of wikibase.datamodel.Reference' );
			}
			// TODO: Redraw
		}

		var response = PARENT.prototype._setOption.apply( this, arguments );

		if ( key === 'disabled' ) {
			this.$listview.data( 'listview' ).option( key, value );
		}

		return response;
	},

	/**
	 * @inheritdoc
	 */
	focus: function() {
		var listview = this.$listview.data( 'listview' ),
			lia = listview.listItemAdapter(),
			$items = listview.items();

		if ( $items.length ) {
			lia.liInstance( $items.first() ).focus();
		} else {
			this.element.focus();
		}
	},

	/**
	 * Get a help message related to editing
	 *
	 * @return {Object} jQuery promise
	 *         Resolved parameters:
	 *         - {string}
	 *         No rejected parameters.
	 */
	getHelpMessage: function() {
		// FIXME: Remove this once referenceview is an EditableTemplatedWidget
		return $.Deferred().resolve( this.options.helpMessage ).promise();
	}
} );

}( mediaWiki, wikibase, jQuery ) );
