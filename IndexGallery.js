/**
 * IndexGallery.js
 * by Denis Volkov (den@denvo.name)
 */

(function (document, undefined) {

	// Gallery options, some of them you may want to change - read comments!
	var GalleryOptions = {
		// Location of CSS file with custom gallery styles.
		// Note that in case of relative URL the base is the page URL, not script
		galleryStylesheet: 'gallery.css',

		// RegExp to select thumbnail files by name 
		// The first submask should give the same name as for corresponding main image
		thumbnailNameRegex: /^(.+)_small$/,

		// If the image doesn't have corresponding thumbnail image, and the URL is specified here,
		// it will be used as a thumbnail src attribute. '%' sign will be replaced by the image URL
		// thumbnailGeneratorURL: '/thumbnail.php?org=%',

		// Description file name
		// If exists, it provider the order of images as well as their titles and descriptions
		descriptionFile: 'description.json',

		// Option to show sub-folders: 'none' (or false value), 'first' (or true value), 'last'
		showSubFolders: 'first',

		// Option to show the link to parent folder: 'none' (or false value), 'first' (or true value), 'last'
		showParentLink: false,

		// Show wait dialog during description file load
		// If set to 'false' the original index will be visible until description is loaded
		showWaitDialog: true,

		// Main image dimansions in the lightbox
		mainImageWidth: 1200,
		mainImageHeight: 800

	};

	// Service constants - Don't change them until you defenitely know what are you doing!
	var Constants = {
		// Library absolute base URL (internal or external)
		libraryBaseURL: '/scripts',

		// List of external JS libraries (@ means library base URL)
		externalJSList: [
			'http://code.jquery.com/jquery-1.11.3.min.js',
			'@/external/lightcase/lightcase.min.js'
		],

		// List of external stylesheets (@ means library base URL)
		externalCSSList: [
			'@/external/lightcase/css/lightcase.css'
		],

		// Base stylesheet (@ means library base URL)
		baseGalleryCSS: '@/IndexGallery.css',

		// Rules to determine file type by it's icon name
		// Change these names if you have different autoindex icons than me
		fileIconTypes: {
			'parent': /\/back\.gif$/,
			'folder': /\/folder\.gif$/,
			'image': /\/image\d+\.gif$/
		}
	};

	/**
	 * Create a new element and add it to the parent
	 */
	function createAddElement(name, parent, attributes) {
		var el = document.createElement(name);
		if(attributes) {
			for(var attrName in attributes) {
				if(attributes.hasOwnProperty(attrName)) {
					el.setAttribute(attrName, attributes[attrName]);
				}
			}
		}
		if(parent) {
			parent.appendChild(el);
		}
		return el;
	}

	/**
	 * Add a new head element (script, link etc)
	 */

	function injectScriptTag (url, head, async) {
		url = url.replace(/^\@/, Constants.libraryBaseURL);
		var script = createAddElement('script', null, {
			type: 'text/javascript',
			src: url
		});
		script.async = async || false;
		head.appendChild(script);
		return script;
	}

	function injectCSSLinkTag (url, head) {
		url = url.replace(/^\@/, Constants.libraryBaseURL);
		return createAddElement('link', head, {
			rel: 'stylesheet',
			type: 'text/css',
			href: url
		});
	}

	/**
	 * Remove the last file extension
	 */
	function cropFileExtension(url) {
		return url.replace(/\.[^\.\/]+$/, '');
	}

	/**
	 * Create absolute URL based on the page URL
	 */
	function getAbsoluteURL(url) {
		var pageFolder = location.href.replace(/\/[^\/]+$/, '/');
		return pageFolder + url;
	}

	/**
	 * Main gallery object constructor
	 */
	function IndexGallery (options) {
		// List of files on the page ( filename => filetype )
		var files = {};

		// Thumbnail to main image mapping
		var thumbnailIndex = {};

		// Order of items of different types in the index
		var itemOrder = {};

		// Is this folder has description file
		var hasDescription = false;

		// Link to the parent folder
		var parentLink = null;

		/**
		 * Remove the original index and the waiting dialog, if any
		 */
		function cleanUpPage(body) {
			for(var n = 0; n < body.children.length; ++ n) {
				var child = body.children[n];
				if(child.name == 'h1') {
					// Hide the header
					child.style.display = 'none';
				} else {
					// Remove everything else
					body.removeChild(child);
					-- n; // Stay on the same place
				}
			}
/*
			var table = body.getElementsByTagName('table')[0];
			if(table) {
				body.removeChild(table);
			}
			var waitDialog = body.getElementsByClassName('waitDialog')[0];
			if(waitDialog) {
				body.removeChild(table);
			}
*/
		}

		/**
		 * Create the gallery description object similar to the external one
		 * but based only on file list
		 * @externalDescription can be used to provide text fields
		 */
		function buildDescription(externalDescription) {
			var description = externalDescription || {};
			description.items = [];

			var items;
			if(options.showSubFolders == 'first') {
				items = (itemOrder.folder || []).concat(itemOrder.image);
			} else if (options.showSubFolders == 'last') {
				items = (itemOrder.image || []).concat(itemOrder.folder);
			} else {
				items = itemOrder.image || [];
			}
			
			for(var n = 0; n < items.length; ++ n) {
				description.items.push({
					url: items[n]
				});
			}

			return description;
		}

		function addParentLink(bidy, url, text) {
			createAddElement('a', body, {
				className: 'parentLink',
				href: url,
				innerHTML: (text || url)
			});
		}

		/**
		 * Clean up the page and create image gallery
		 */
		function renderGallery(body, description) {
			// Clean up the page
			cleanUpPage(body);

			// Set up the header
			if(description.title) {
				var header = body.getElementsByTagName('h1')[0];
				if(!header) {
					header = createAddElement('h1', body);
				}
				header.innerHTML = description.title;
				header.style.display = 'block';	// Restore visibility of the header
				var title = document.getElementsByTagName('title')[0];
				if(!title) {
					var head = document.getElementsByTagName('head')[0];
					title = createAddElement('title', head);
				}
				// Strip any HTML tags from the title
				title.innerHTML = description.title.replace(/\<.+?\>/g, '');
			}
			if(description.subtitle) {
				var subtitle = createAddElement('h2', body);
				subtitle.innerHTML = description.subtitle;
			}

			if(options.showParentLink == 'first' && parentLink) {
				addParentLink(body, parentLink, description.parentLink);
			}

			// Create the list of thumbnails
			var list = createAddElement('ul', body, {
				id: 'image-list'
			});
			for(var n = 0; n < description.items.length; ++ n) {
				var item = description.items[n];

				// Skip non-existing items
				if(!files[item.url]) {
					continue;
				}

				// Looking for a thumbnail
				var thumb, imgName; 
				var itemType = files[item.url];
				if(itemType == 'image') {
					imgName = cropFileExtension(item.url);
					thumb = thumbnailIndex[imgName];
					if(!thumb) {
						if(options.thumbnailGeneratorURL) {
							imgName = getAbsoluteURL(item.url);
							thumb = options.thumbnailGeneratorURL.replace('%', imgName);
						} else {
							thumb = item.url;
						}
					}
				}

				var listItem = createAddElement('li', list, {
					'class': ('item-' + itemType)
				});
				var linkAttrs = {
					href: item.url,
					title: (item.description || ''),
					'data-title': (item.title || item.url)
				};
				// LightCase specific setup (see http://cornel.bopp-art.com/lightcase/)
				if(itemType == 'image') {
					linkAttrs['data-rel'] = 'lightcase:imgCollection';
				}
				var link = createAddElement('a', listItem, linkAttrs);
				if(itemType == 'image') {
					link.style.backgroundImage = "url('" + thumb + "')";
				}
			}

			if(options.showParentLink == 'last' && parentLink) {
				addParentLink(body, parentLink, description.parentLink);
			}

			// Initialize lightbox plugin
			$('#image-list li.item-image a').lightcase({
				maxWidth: options.mainImageWidth,
				maxHeight: options.mainImageHeight
			});

		}

		function createSimpleGallery(body) {
			var description = buildDescription();
			renderGallery(body, description);
		}

		function createWaitDialog(body) {
			var waitDialog = createAddElement('div', body, {
				id: 'wait-dialog'
			});
		}

		/**
		 * Load the file with description JSON, then create the gallery
		 */
		function createGalleryWithDescription(body) {
			jQuery.ajax({
				url: options.descriptionFile,
				dataType: 'json',
				error: function () {
					// As a failback, create simple gallery
					createSimpleGallery(body);
				},
				success: function(description) {
					// Check if description has a list of items
					if(!description.items) {
						description = buildDescription(description);
					}
					renderGallery(body, description);
				}
			});
		}

		/**
		 * Detect item type, add item to the files list
		 */
		function addItemToFiles(iconName, itemURL) {
			// Special files
			if(options.descriptionFile == itemURL) {
				hasDescription = true;
			} else {
				// Determine the file type by icon name
				var typeKey, thumbnailMatch;
				for(typeKey in Constants.fileIconTypes) {
					if(iconName.match(Constants.fileIconTypes[typeKey])) {
						// Special processing for images
						if(typeKey == 'image') {
							if(options.thumbnailNameRegex) {
								thumbnailMatch = itemURL.match(options.thumbnailNameRegex);
								if(thumbnailMatch) {
									thumbnailIndex[thumbnailMatch[1]] = itemURL;
									typeKey = 'thumbnail';
								}
							}
						} else if(typeKey == 'folder') {
							// Trim the trailing slash
							itemURL = itemURL.replace(/\/$/, '');
						}

						if(typeKey == 'parent') {
							parentLink = itemURL;

						} else if(typeKey == 'image' || typeKey == 'folder') {
							// Add the item to the file list and to itemOrder object
							files[itemURL] = typeKey;
							if(!itemOrder[typeKey]) {
								itemOrder[typeKey] = [];
							}
							itemOrder[typeKey].push(itemURL);

							break;
						}
					}
				}
			}
		}

		/**
		 * Fill files object with the list of files on the page
		 */
		function buildFileList(body) {
			var rows = body.getElementsByTagName('tr');
			for(var n = 0; n < rows.length; ++ n) {
				var cells = rows[n].getElementsByTagName('td');
				if(cells.length > 1) {
					var iconImg = cells[0].getElementsByTagName('img')[0];
					var itemLink = cells[1].getElementsByTagName('a')[0]; 
					if(iconImg && itemLink) {
						var iconName = iconImg.getAttribute('src');
						var itemURL = decodeURIComponent(itemLink.getAttribute('href'));
						addItemToFiles(iconName, itemURL);
					}
				}
			}
		}

		/**
		 * Initialize the Gallery after page loaded
		 */
		this.init = function () {
			// Get the list of files from index
			var body = document.getElementsByTagName('body')[0];
			buildFileList(body);

			// If the external description is not available, build the fake one
			// then render the page
			if(hasDescription) {
				createGalleryWithDescription(body);
				if(options.showWaitDialog) {
					// Clean up the page and create the splash screen with wait dialog 
					cleanUpPage(body);
					createWaitDialog(body);
				}
			} else  {
				createSimpleGallery(body);
			} 
		};

		// Add scripts and stylesheets
		var n;
		var head = document.getElementsByTagName('head')[0];
		for(n = 0; n < Constants.externalJSList.length; ++ n) {
			injectScriptTag(Constants.externalJSList[n], head);
		}
		for(n = 0; n < Constants.externalCSSList.length; ++ n) {
			injectCSSLinkTag(Constants.externalCSSList[n], head);
		}
		injectCSSLinkTag(Constants.baseGalleryCSS, head);
		if(options.galleryStylesheet) {
			injectCSSLinkTag(options.galleryStylesheet, head);
		}
	}

	// Create and initialize the main object after document is loaded
	// Easy way to change options - specify another object in constructor
	var gallery = window.gallery = new IndexGallery(GalleryOptions);
	window.onload = function () {
		gallery.init();
	}


})(document);
