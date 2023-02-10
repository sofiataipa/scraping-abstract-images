const https = require('https');
const JSSoup = require('jssoup').default;
const fs = require('fs');
const { profile } = require('console');
//const url = "https://www.pexels.com/search/abstract/";//FIRST, find a url of a page on Wikipedia that you are interested in
const url = "https://unsplash.com/s/photos/abstract";//FIRST, find a url of a page on Wikipedia that you are interested in
const jsonPath = "./json/"; 
const imagePath = "./images/"; 
const name = "abstract";


/*
This web-scraping example is set up for working with wikipedia.If you want to adapt this
to scrape another site you should go and inspect the site in the browser first, then adapt this. 
*/

//get all image urls from the soup
function getAllImages(soupTag){
    let imgs = soupTag.findAll('img');
    let imgUrls = [];

    for(let i = 0; i < imgs.length; i++){
        let attrs = imgs[i].attrs;// get a tag attributes

        // if there is an href attribute let's get it
        if('srcSet' in attrs)
        {
            if(!attrs.srcSet.includes("premium_photo") && !attrs.srcSet.includes("profile")) {
                let src = attrs.srcSet.split("500w,")[1].split("600w,")[0].trim();
               
                if(src.indexOf("https:") == -1)
                    src = "https:"+src;

                console.log(src);
                imgUrls.push(src);
            }
        }
    }
    return imgUrls;
}


//get all the image names and return as an array
function getImageNames(imageUrls){
    let imageFileNames = [];

    for(let i = 0; i < imageUrls.length; i++){
        imageFileNames.push(getName(imageUrls[i]));
    }
    return imageFileNames;
}

//split url on the "/" character and get the last element from 
//the returned array which will give us the file name
function getName(url){
    let step1 = url.split("/");
    let step2 = step1[step1.length-1].split("?");
    let name = step2[0] + ".png";
    return name;
}

//download images, pass in an array of urls
function recursiveDownload(imageUrlArray,i){
    
    //to deal with the asynchronous nature of a get request we get the next image on successful file save
    if (i < imageUrlArray.length) {
  
        //get the image url
        https.get(imageUrlArray[i], (res) => {
        
            //200 is a successful https get request status code
            if (res.statusCode === 200) {
                //takes the readable stream, the response from the get request, and pipes to a writeable stream
                res.pipe(fs.createWriteStream(imagePath+"/"+getName(imageUrlArray[i])))
                    .on('error', (e) => {
                        console.log(e);
                        recursiveDownload (imageUrlArray, i+1); //skip any failed ones
                    })
                    .once('close', ()  => {
                        console.log("File saved");
                        recursiveDownload (imageUrlArray, i+1); //download the next image
                    });
            } else {
                console.log(`Image Request Failed With a Status Code: ${res.statusCode}`);
                recursiveDownload (imageUrlArray, i+1); //skip any failed ones
            }
        });
    }
}

//pass in Plain Old Javascript Object that's formatted as JSON
function writeJSON(data){
    try {
        let path = jsonPath+name+".json";
        fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
        console.log("JSON file successfully saved");
    } catch (error) {
        console.log("An error has occurred", error);
    }
}

//create soup  
function createSoup(document){
    let soup = new JSSoup(document);
    let data = {
        "name": name,
        "url": url,
        "content": {}
    }; 

    //let main = soup.find("div", class_= "spacing_noMargin__Q_PsJ"); //only get the content from the main tag of the page
    //let bodyContent = soup.find('div', { id: '-' });
    let bodyContent = soup.find('div', { class: 'mItv1' });
    let images = getAllImages(bodyContent);

    data.content = {
        "imageNames": getImageNames(images) //store the array of image names in json file
    }

    //output json
    writeJSON(data);

    //download all images
    recursiveDownload(images, 0);
}


//Request the url
https.get(url, (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    
    let document = [];

    res.on('data', (chunk) => {
        document.push(chunk);
    }).on('end', () => {
        document = Buffer.concat(document).toString();
        createSoup(document);
    });

}).on('error', (e) => {
    console.error(e);
});

