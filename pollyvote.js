/*
Plugin Name: pollyvote
Plugin URI:  http://pollyvote.com
Author:      Mario Haim
Author URI:  http://haim.it
License:     GPL2
License URI: https://www.gnu.org/licenses/gpl-2.0.html
*/

/**
 * Class definition of PollyVote data handler.
 */
var PollyVote = {
    /**
     * Main URL to load Backend data from.
     */
    sBasicUrl: '/wp-content/plugins/pollyvote/data/index.php',
	
	/**
	 * Amount of hours that local data is valid (i.e., allowed age before refreshing data).
	 */
	nInterval: 2,
    
	/**
	 * Array of possible/available model components
	 */
	aComponent: [ 'pollyvote', 'markets', 'markets_combined', 'polls', 'polls_combined', 'index_models', 'econ_models', 'index_models_combined', 'econ_models_combined', 'experts', 'experts_combined', 'expectations', 'expectations_combined' ],
    
    /**
     * Mapping object if request name and return type are not alike.
     */
    oComponentMapping: {
        pm: 'markets',
        pm_combined: 'markets_combined',
        intentionpolls: 'polls',
        intentionpolls_combined: 'polls_combined'
    },
	
	/**
	 * Internal data storage (could be false (no data loaded) or a data object)
	 */
	mNational: false,
	
	/**
	 * Set to true as soon as data is loaded.
	 */
	bReady: false,
	
	/**
	 * Number of required datasets in order to be data-loaded ready.
	 */
	nTotalDataRequired: 0,
	
	
	/**
	* Initializing method. Checks whether data is available/up-to-date and sets/loads variables accordingly.
	*/
	init: function() {
        //set momentjs locale
        moment.locale(jQuery('html').attr('lang'));
        //check for data
		if(this.mNational === false) {
			if(this.isStorageAvailable(true)) {
				this.loadDataFromStorage();
			} else {
				this.loadDataFromAPI();
			}
		}
	},
	
	/**
	* Returns true/false depending on whether data in this object is avbailable and ready-to-use.
	* 
	* @return	boolean	true if data is available
	*/
	isReady: function() {
        return this.bReady ? true : this.nTotalDataRequired == 0;
	},
	
	/**
	* Returns true/false depending on whether a localStorage is available.
	*
	* @param	_bIsUpToDate	boolean	if set to true, method also checks whether currently saved data is up to date
	* @return	boolean	true if storage is available (and data is up-to-date)
	*/
	isStorageAvailable: function(_bIsUpToDate) {
		if(typeof(Storage) === 'undefined') {
			return false;
		} else {
			if(_bIsUpToDate) {
				return typeof(localStorage.dLastUpdate) !== 'undefined' && (moment() - moment(localStorage.dLastUpdate))/3600000 < this.nInterval;
			} else {
				return true;
			}
		}
	},
	
	/**
	* Load data from localStorage into current variable.
	* @return	void
	*/
	loadDataFromStorage: function() {
		this.mNational = {};
        this.nTotalDataRequired = 0;
        for(var i = 0; i < this.aComponent.length; i++) {
            if(typeof(localStorage[this.aComponent[i]]) == 'undefined') {
                this.loadDataFromAPI(this.aComponent[i]);
            } else {
                this.mNational[this.aComponent[i]] = JSON.parse(localStorage[this.aComponent[i]]);
                this.prepareData(this.aComponent[i]);
            }
		}
        this.bReady = this.nTotalDataRequired == 0;
	},
	
	/**
	* Load data from PHP backend and save a local copy (as variable, or, if possible, into localStorage).
	* @return	void
	*/
	loadDataFromAPI: function(_sSpecificComponent) {
        if(this.mNational === false) {
            this.mNational = {};
        }
        if(typeof(_sSpecificComponent) == 'undefined') {
            this.nTotalDataRequired = this.aComponent.length;
            for(var i = 0; i < this.nTotalDataRequired; i++) {
                jQuery.getJSON(this.sBasicUrl, { time: 'current', type: this.aComponent[i] }, function(_oData) { PollyVote.storeData(_oData) });
            }
        } else {
            this.nTotalDataRequired++;
            jQuery.getJSON(this.sBasicUrl, { time: 'current', type: _sSpecificComponent }, function(_oData) { PollyVote.storeData(_oData) });
        }
	},
	
	/**
	* Stores data from the backend into localStorage (or this.mNational if no localStorage is available).
	* @param	_oData	object	data from the API in JSON format
	* @return	void
	*/
	storeData: function(_oData) {
        var sType = _oData.type;
        var sStorageName = typeof(this.oComponentMapping[sType]) == 'undefined' ? sType : this.oComponentMapping[sType];
        this.mNational[sStorageName] = _oData.data;
		if(this.isStorageAvailable()) {
            localStorage[sStorageName] = JSON.stringify(_oData.data);
			localStorage.dLastUpdate = moment().format();
		}
        this.prepareData(sStorageName);
        this.nTotalDataRequired--;
        this.bReady = this.nTotalDataRequired == 0;
	},
    
    /**
    * Prepares data to be ready for momentJS and the like.
    * @param    _sType  string  position within this.mNational to be prepared
    * @return   void
    */
    prepareData: function(_sType) {
        if(typeof(this.mNational[_sType]) != 'undefined') {
            for(var i = 0; i < this.mNational[_sType].length; i++) {
                this.mNational[_sType][i].fcdate = moment(this.mNational[_sType][i].fcdate, 'DD.MM.YYYY').format();
                this.mNational[_sType][i].fcdemvs = parseFloat(this.mNational[_sType][i].fcdemvs).toFixed(1);
                this.mNational[_sType][i].fcrepvs = parseFloat(this.mNational[_sType][i].fcrepvs).toFixed(1);
                if(this.mNational[_sType][i].released != '') {
                    this.mNational[_sType][i].released = moment(this.mNational[_sType][i].released, 'DD.MM.YYYY').format();
                }
                if(this.mNational[_sType][i].firstsurveyday != '') {
                    this.mNational[_sType][i].firstsurveyday = moment(this.mNational[_sType][i].firstsurveyday, 'DD.MM.YYYY').format();
                    this.mNational[_sType][i].lastsurveyday = moment(this.mNational[_sType][i].lastsurveyday, 'DD.MM.YYYY').format();
                }
            }
        }
    },
	
	
	/**
	* Get PollyVote forecast over time
	* @return	array	see pollyvote.com/api for details
	*/
	get: function() {
		return this.mNational === false || typeof(this.mNational.pollyvote) == 'undefined' ? [] : this.mNational.pollyvote;
	},
	
	/**
	* Get details for a single component (over time)
	* @param	_sComponent	string	one of markets, intentionpolls, experts, econ_model, ... (see pollyvote.com/api)
	* @return	array      every case represents a single date
	*/
	getComponent: function(_sComponent) {
        return this.getSingle(_sComponent.indexOf('_combined') > 0 ? _sComponent : (_sComponent + '_combined'));
	},
	
	/**
	* Get details for single elements (i.e., polls, markets) within a component (over time)
	* @param   _sComponent string  see pollyvote.com/api
	* @return	array      every case represents a single element on a specific date
	*/
	getSingle: function(_sComponent) {
		if(!jQuery.inArray(_sComponent, this.aComponent)) {
			return [];
		}
		return this.mNational === false || typeof(this.mNational[_sComponent]) == 'undefined' ? [] : this.mNational[_sComponent];
	},
	
	/**
	* Get PollyVote forecast over time including components, but only for a single state.
	* @param	_sState	string	abbreviation of state (e.g., AL)
	* @return	object	date, two-party vote share for incumbent (D), single components
	*/
	getState: function(_sState) {
		return null;
	},
	
	/**
	* Get details for a single component (over time), state-level only.
	* @param	_sState	string	abbreviation of state (e.g., AL)
	* @param	_sComponent	string	one of psm, poll, expert, model
	* @return	object	date, two-party vote share for incumbent (D), state-total and per item
	*/
	getStateComponent: function(_sState, _sComponent) {
		return null;
	},
	
	/**
	* Get details for a single component (over time), state-level only.
	* @param	_sState	string	abbreviation of state (e.g., AL)
	* @param	_sComponent	string	one of psm, poll, expert, model
	* @return	object	date, two-party vote share for incumbent (D), state-total and per item
	*/
	getStateSingle: function(_sState, _sComponent, _sSingle) {
		return null;
	}
};

/**
 * Autoloader
 */
jQuery(function() {
	PollyVote.init();
});
