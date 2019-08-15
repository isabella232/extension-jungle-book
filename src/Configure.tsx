import React, { useState, useEffect } from 'react';
import { Button, Pill, Radio, Spinner, TextField } from '@tableau/tableau-ui';
import { Item, Image } from './Home';
import './Configure.css';

const tableau = window.tableau;

function Config() {

    const [loading, setLoading] = useState<boolean>(true);
    const [noData, setNoData] = useState<boolean>(false);
    const [dimensions, setDimensions] = useState<Array<Item>>([]);
    const [worksheets, setWorksheets] = useState<Array<Item>>([]);
    const [searchValue, setSearchValue] = useState<string>('');
    const [scaling, setScaling] = useState<number>(0);
    const [image, setImage] = useState<Image>();

    useEffect(() => {
        tableau.extensions.initializeDialogAsync().then(() => {
            const settings = tableau.extensions.settings.getAll();
            if (settings.configured === 'true') {
                getItems(JSON.parse(settings.dimensions), JSON.parse(settings.worksheets));
                setImage({ ...JSON.parse(settings.image) });
                setScaling(parseInt(settings.scaling));
            } else {
                getItems();
            }
        }, (error: any) => {
            alert('Initialization failed: ' + error.toString());
        });
    }, []);

    const getItems = (selectedDimensions: string[] = [], selectedWorksheets: string[] = []) => {
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        let worksheetList: Item[] = [];
        let dimensionList: Item[] = [];
        let filterPromises = [];
        for (let worksheet of worksheets) {
            worksheetList.push({
                name: worksheet.name,
                selected: selectedWorksheets.includes(worksheet.name),
            });
            filterPromises.push(worksheet.getFiltersAsync());
        }
        setWorksheets(worksheetList);

        Promise.all(filterPromises).then((filterResults: any) => {
            for (let wsFilters of filterResults) {
                for (let filter of wsFilters) {
                    if (filter.filterType === 'categorical' && !dimensionList.find((dimension: Item) => dimension.name === filter.fieldName)) {
                        dimensionList.push({
                            name: filter.fieldName,
                            selected: selectedDimensions.includes(filter.fieldName),
                        })
                    }
                }
            }
            if (worksheetList.length === 0 || dimensionList.length === 0) {
                setNoData(true);
            }
            setDimensions(dimensionList);
            setLoading(false);
        });
    }

    const previewImage = (e: any) => {
        // Get the image from the file input
        const file = e.target.files[0]

        if (file) {
            // Regex to get file extension and name
            const re = /(?:\.([^.]+))?$/;
            const ext = re.exec(file.name)![1];
            const name = file.name.slice(0, -ext.length);

            // Check if file is an image
            const accepted = ['image/gif', 'image/jpeg', 'image/png'];
            const valid = file && accepted.includes(file.type);
            if (valid) {
                // Create a new FileReader so we can read the contents of the image
                const reader = new FileReader();

                // Update the image data
                reader.addEventListener('load', () => {
                    if (reader.result) {
                        const data = (reader.result as string).substring((reader.result as string).search(',') + 1);
                        // console.log(data)
                        // console.log('hiii')

                        const newImage = {
                            name,
                            ext,
                            data,
                        }
                        setImage(newImage)
                    }
                }, false);

                // If an image was selected load the file into the FileReader
                if (file) {
                    reader.readAsDataURL(file);
                }
            } else {
                alert('The selected file is not a .gif, .jpg, .jpeg, or .png')
            }
        }
    }

    const updateSelection = (e: any) => {
        const selection = e.target.innerText;
        const type = e.target.dataset.type;
        let newItems = type === 'dimension' ? [...dimensions] : [...worksheets];
        newItems.map(item => {
            if (item.name === selection) {
                item.selected = !item.selected;
            }
            return item;
        })
        type === 'dimension' ? setDimensions(newItems) : setWorksheets(newItems);
    }

    const updateScaling = (e: any) => {
        setScaling(parseInt(e.target.value))
    }

    const updateSearch = (e: any) => {
        setSearchValue(e.target.value);
    }

    const clearSearch = () => {
        setSearchValue('')
    }

    const submit = () => {
        setLoading(true);
        const selectedDimensions = dimensions.filter((d) => { return d.selected === true }).map((dimension) => { return dimension.name });
        const selectedWorksheets = worksheets.filter((w) => { return w.selected === true }).map((worksheet) => { return worksheet.name });

        tableau.extensions.settings.set('configured', 'true');
        tableau.extensions.settings.set('dimensions', JSON.stringify(selectedDimensions));
        tableau.extensions.settings.set('worksheets', JSON.stringify(selectedWorksheets));
        tableau.extensions.settings.set('image', JSON.stringify(image));
        tableau.extensions.settings.set('scaling', scaling);
        tableau.extensions.settings.saveAsync().then(() => {
            tableau.extensions.ui.closeDialog('');
        });
    }

    return (
        <>
            <div className={`nodata${noData ? '' : ' hidden'}`}>No worksheets with filters were found on the dashboard.</div>
            <div className={`spinner${loading ? '' : ' hidden'}`}><Spinner color='dark' /></div>
            <div className='headerRow'>
                <div className='dialogTitle'>Jungle Book</div>
                <div className='tooltip'>
                    <svg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 15 15'>
                        <rect x='7' y='6' width='1' height='5' fillRule='evenodd' clipRule='evenodd' fill='#666766' />
                        <rect x='7' y='4' width='1' height='1' fillRule='evenodd' clipRule='evenodd' fill='#666766' />
                        <path d='M7.5,1C3.9,1,1,3.9,1,7.5S3.9,14,7.5,14 S14,11.1,14,7.5S11.1,1,7.5,1z M7.5,13C4.5,13,2,10.5,2,7.5C2,4.5,4.5,2,7.5,2S13,4.5,13,7.5C13,10.5,10.5,13,7.5,13z' fillRule='evenodd' clipRule='evenodd' fill='#666766' />
                    </svg>
                    <span className='tooltiptext'>
                        <b>How to Configure</b>
                        <p>Note: There must be at least one worksheet on the dashboard and that worksheet must have the filters you want to use.</p>
                        <ol>
                            <li>Select an image that you want to overlay filter(s) on. (Only .gif, .jpg, .jpeg, and .png accepted)</li>
                            <li>Set your preference for how your image will scale if the container is resized.  Note: Using a fixed-sized zone or 'Actual image size' will give the best results.</li>
                            <li>Select dimension(s) from sheets in your dashboard that you want to filter on.  Note: Dimension must be set as a filter on at least one dashboard sheet.</li>
                            <li>Select which worksheets you want the filtering action to affect.</li>
                            <li>After closing configuration, draw shapes on your image in the container and select filters to map each shape to.</li>
                        </ol>
                    </span>
                </div>
            </div>
            <div className='headerRow'>
                Select an image for your background, then select dimensions and worksheets to filter on.
                </div>
            <div className='bodyRow'>
                <div className='bodyColumn scrolly'>
                    <div className='sectionTitle'>Image</div>
                    <div className='inputBox'>
                        <span className='imgName ellipsis'>{image ? image.name : 'Choose an image...'}</span>
                        <span className='imgExt'>{image ? image.ext : ''}</span>
                        <input className='imgInput' type='file' accept='image/*' id='imgInput' onChange={previewImage} />
                        <label className='imgLabel' htmlFor='imgInput'>Choose</label>
                    </div>
                    <div className='previewBox'>
                        <img id='previewImg' alt='Preview box' src={image ? `data:image/png;base64, ${image.data}` : './icons/ImagePlaceholder.svg'} className={`previewImg${image ? ' checkered' : ''}`} />
                    </div>
                    <div className='sectionTitle'>Image scaling</div>
                    <div className='scalingOptions'>
                        <Radio
                            name='scaling'
                            key={0}
                            value={0}
                            children='Scale to container'
                            checked={scaling === 0}
                            onChange={updateScaling}
                            style={{ width: '100%' }}
                        />
                        <Radio
                            name='scaling'
                            key={1}
                            value={1}
                            children='Actual image size'
                            checked={scaling === 1}
                            onChange={updateScaling}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
                <div className='bodyDivider'></div>
                <div className='bodyColumn scrolly'>
                    <div className='sectionTitle'>Dimensions</div>
                    <div className='listBox'>
                        <TextField
                            kind='search'
                            value={searchValue}
                            placeholder='Search'
                            onClear={clearSearch}
                            onChange={updateSearch}
                            style={{ width: '100%', padding: '2px' }}
                        />
                        <div id='dimensions' className='list scrolly'>
                            {dimensions.map(dimension =>
                                <Pill
                                    kind='discrete'
                                    schema={true}
                                    selected={dimension.selected}
                                    onMouseDown={updateSelection}
                                    children={dimension.name}
                                    key={dimension.name}
                                    style={{ marginBottom: '4px', display: (searchValue === '' || dimension.name.toUpperCase().includes(searchValue.toUpperCase())) ? '' : 'none' }}
                                    data-type={'dimension'}
                                />
                            )}
                        </div>
                    </div>
                    <div className='sectionTitle'>Worksheets</div>
                    <div className='listBox worksheetBox'>
                        <div id='worksheets' className='list scrolly'>
                            {worksheets.map(worksheet =>
                                <Pill
                                    kind='discrete'
                                    schema={true}
                                    selected={worksheet.selected}
                                    onMouseDown={updateSelection}
                                    children={worksheet.name}
                                    key={worksheet.name}
                                    style={{ marginBottom: '4px' }}
                                    data-type={'worksheet'}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className='footerRow'>
                <div className='button'>
                    <Button
                        id='ok'
                        kind='primary'
                        children='OK'
                        onClick={submit}
                        disabled={dimensions.find(dimension => dimension.selected) === undefined || worksheets.find(worksheet => worksheet.selected) === undefined || !image}
                    />
                </div>
            </div>
        </>
    );
}

export default Config;