import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import Slider from "@material-ui/core/Slider";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";

const styles = {
    cropContainer: {
        position: "relative",
        width: "100%",
        height: 400,
        background: "#333",
    },
    controls: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 20,
    },
    sliderContainer: {
        display: "flex",
        alignItems: "center",
        margin: "20px 0",
    },
    sliderLabel: {
        minWidth: 65,
    },
    slider: {
        marginLeft: 20,
        width: "80%",
    },
    cropButton: {
        flexShrink: 0,
        marginLeft: 16,
    },
};

const getCroppedImg = async (imageSrc, crop, rotation = 0) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const safeArea = Math.max(image.width, image.height) * 2;

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
        image,
        safeArea / 2 - image.width * 0.5,
        safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.putImageData(
        data,
        -safeArea / 2 + image.width * 0.5 - crop.x,
        -safeArea / 2 + image.height * 0.5 - crop.y
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                resolve(reader.result);
            };
        }, "image/jpeg");
    });
};

const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous");
        image.src = url;
    });

const ImageCropper = ({ classes, imageSrc, onCroppedImage }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = useCallback(async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            onCroppedImage(croppedImage);
        } catch (e) {
            console.error(e);
        }
    }, [imageSrc, croppedAreaPixels, rotation, onCroppedImage]);

    return (
        <div>
            <div className={classes.cropContainer}>
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    rotation={rotation}
                    zoom={zoom}
                    aspect={4 / 3}
                    onCropChange={setCrop}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                />
            </div>
            <div className={classes.controls}>
                <div className={classes.sliderContainer}>
                    <Typography variant="overline" classes={{ root: classes.sliderLabel }}>
                        Zoom
                    </Typography>
                    <Slider
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        classes={{ root: classes.slider }}
                        onChange={(e, zoom) => setZoom(zoom)}
                    />
                </div>
                <div className={classes.sliderContainer}>
                    <Typography variant="overline" classes={{ root: classes.sliderLabel }}>
                        Rotation
                    </Typography>
                    <Slider
                        value={rotation}
                        min={0}
                        max={360}
                        step={1}
                        aria-labelledby="Rotation"
                        classes={{ root: classes.slider }}
                        onChange={(e, rotation) => setRotation(rotation)}
                    />
                </div>
                <Button
                    onClick={showCroppedImage}
                    variant="contained"
                    color="primary"
                    classes={{ root: classes.cropButton }}
                >
                    Show Result
                </Button>
            </div>
        </div>
    );
};

export default withStyles(styles)(ImageCropper);
