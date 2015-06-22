# IndexGallery
A client-side script to convert Apache HTTP mod_autoindex-generated page into a nice looking image gallery.

## Installation

* Clone the whole project into a folder in the webserver document tree
* Open ImageGallery.js in a text editor and change libraryBaseURL value in Constants object so
  it contains a path to the folder with IndexGallery files
* In a folder with image files create (or modify) .htaccess file and add the following lines:

        Options +Indexes
        IndexOptions HTMLTable 
        IndexHeadInsert "<script type=\"text/javascript\" src=\"/scripts/IndexGallery.js\"></script>"

Note that:

1. /scripts/IndexGallery.js needs to be replaced with actual path to IndexGallery main script file
2. all subfolders of the folder with .htaccess file will be affected too. Add another .htaccess file there with a line:

        Options -Indexes
        
to prevent them from indexing


