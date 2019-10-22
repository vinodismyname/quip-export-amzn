const path =  require('path');
const Spinner = require('cli-spinner').Spinner;
const colors = require('colors');
const cliProgress = require('cli-progress');

const QuipProcessor =  require('./lib/QuipProcessor');
const QuipService =  require('./lib/QuipService');
const utils = require('./lib/common/utils');
const CliArguments = require('./lib/cli/CliArguments');

const DESTINATION_PATH_WIN = 'c:\\temp';
const DESTINATION_PATH_MAC = '/Users/alex/Downloads/';
const DESTINATION_PATH = DESTINATION_PATH_WIN;

const documentTemplate = utils.readTextFile(path.join(__dirname, '/lib/templates/document.ejs'));
const documentCSS = utils.readTextFile(path.join(__dirname, '/lib/templates/document.css'));

let desinationFolder;
let cliArguments;

let quipProcessor;

let spinnerIndikator, progressIndikator;
let updateProgess = ()=>{};

function fileSaver(data, fileName, type, filePath) {
    if(type === 'BLOB') {
        utils.writeBlobFile(path.join(desinationFolder, filePath, fileName), data);
    } else {
        utils.writeTextFile(path.join(desinationFolder, filePath, fileName), data);
    }
    //console.log(colors.red(DESTINATION_PATH, filePath, fileName, path.join(DESTINATION_PATH, filePath, fileName)));
    //console.log("SAVE: ", fileName, "PATH: ", filePath);
}

function progressFunc(progress) {
    updateProgess(progress);
}

function phaseFunc(phase, prevPhase) {
    if(phase === 'START') {
        process.stdout.write(colors.gray(`Quip API: ${quipProcessor.quipService.apiURL}`));
        process.stdout.write('\n');
    }

    if (phase === 'ANALYSE'){
        process.stdout.write('\n');
        process.stdout.write(colors.cyan('Starting analyse...'));
        process.stdout.write('\n');

        spinnerIndikator = new Spinner(' %s  read 0 folder(s) | 0 thread(s)');
        spinnerIndikator.setSpinnerDelay(80);
        spinnerIndikator.setSpinnerString("|/-\\");

        updateProgess = (progress) => {
            spinnerIndikator.text = ` %s  read ${progress.readFolders} folder(s) | ${progress.readThreads} thread(s)`;
        };

        spinnerIndikator.start();
    }

    if(prevPhase === 'ANALYSE') {
        spinnerIndikator.onTick(`    read ${quipProcessor.foldersTotal} folder(s) | ${quipProcessor.threadsTotal} thread(s)`);
        spinnerIndikator.stop();
        process.stdout.write('\n');
    }

    if(phase === 'EXPORT') {
        process.stdout.write('\n');
        process.stdout.write(colors.cyan('Starting export...'));
        process.stdout.write('\n');

        progressIndikator = new cliProgress.Bar({
            format: '   |{bar}| {percentage}% | {value}/{total} threads | ETA: {eta_formatted}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: false
        });
        progressIndikator.start(quipProcessor.threadsTotal, 0);
        updateProgess = (progress) => {
            progressIndikator.update(progress.threadsProcessed);
        };
    }

    if(prevPhase === 'EXPORT') {
        progressIndikator.stop();
        process.stdout.write('\n');
    }
}

function main() {
    //console.log(); current dir
    try {
         cliArguments = CliArguments();
    } catch (message) {
        console.log(message);
        return;
    }

    //Token verification
    const quipService = new QuipService(cliArguments.token);
    quipService.getUser().catch(()=> {
        console.log(colors.red('ERROR: Token is wrong or expired.'));
        return;
    });

    //current folder as destination, if not set
    desinationFolder = (cliArguments.destination || process.cwd()) + "/quip-export";

    quipProcessor = new QuipProcessor(cliArguments.token,
        fileSaver,
        progressFunc,
        phaseFunc, {
        documentTemplate: documentTemplate
    });

    utils.writeTextFile(path.join(desinationFolder, 'document.css'), documentCSS);

    quipProcessor.startExport();
}

module.exports = main;