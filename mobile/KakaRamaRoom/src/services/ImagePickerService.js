import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Platform, Alert} from 'react-native';
import ImageResizer from '@bam.tech/react-native-image-resizer';

class ImagePickerService {
  constructor() {
    this.imagePickerOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission() {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await request(permission);
      
      console.log('ImagePickerService: Camera permission result:', result);
      
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('ImagePickerService: Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request storage permission
   */
  async requestStoragePermission() {
    try {
      if (Platform.OS === 'ios') {
        return true; // iOS doesn't need explicit storage permission for image picker
      }

      const permission = Platform.Version >= 33 
        ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

      const result = await request(permission);
      
      console.log('ImagePickerService: Storage permission result:', result);
      
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('ImagePickerService: Error requesting storage permission:', error);
      return false;
    }
  }

  /**
   * Open camera to take photo
   */
  async openCamera() {
    try {
      console.log('ImagePickerService: Opening camera...');

      // Request camera permission
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos. Please enable it in settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Settings', onPress: () => {/* Open settings */}},
          ]
        );
        return {success: false, message: 'Camera permission denied'};
      }

      return new Promise((resolve) => {
        launchCamera(this.imagePickerOptions, async (response) => {
          if (response.didCancel) {
            console.log('ImagePickerService: Camera cancelled');
            resolve({success: false, message: 'Camera cancelled'});
            return;
          }

          if (response.errorMessage) {
            console.error('ImagePickerService: Camera error:', response.errorMessage);
            resolve({success: false, message: response.errorMessage});
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            console.log('ImagePickerService: Camera photo taken:', asset);
            
            // Process and resize image
            const processedImage = await this.processImage(asset);
            resolve({success: true, data: processedImage});
          } else {
            resolve({success: false, message: 'No image captured'});
          }
        });
      });
    } catch (error) {
      console.error('ImagePickerService: Camera error:', error);
      return {success: false, message: error.message};
    }
  }

  /**
   * Open gallery to select photo
   */
  async openGallery() {
    try {
      console.log('ImagePickerService: Opening gallery...');

      // Request storage permission
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Storage permission is required to access photos. Please enable it in settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Settings', onPress: () => {/* Open settings */}},
          ]
        );
        return {success: false, message: 'Storage permission denied'};
      }

      return new Promise((resolve) => {
        launchImageLibrary(this.imagePickerOptions, async (response) => {
          if (response.didCancel) {
            console.log('ImagePickerService: Gallery cancelled');
            resolve({success: false, message: 'Gallery cancelled'});
            return;
          }

          if (response.errorMessage) {
            console.error('ImagePickerService: Gallery error:', response.errorMessage);
            resolve({success: false, message: response.errorMessage});
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            console.log('ImagePickerService: Gallery photo selected:', asset);
            
            // Process and resize image
            const processedImage = await this.processImage(asset);
            resolve({success: true, data: processedImage});
          } else {
            resolve({success: false, message: 'No image selected'});
          }
        });
      });
    } catch (error) {
      console.error('ImagePickerService: Gallery error:', error);
      return {success: false, message: error.message};
    }
  }

  /**
   * Process and resize image
   */
  async processImage(asset) {
    try {
      console.log('ImagePickerService: Processing image:', asset.uri);

      // Resize image if it's too large
      const resizedImage = await ImageResizer.createResizedImage(
        asset.uri,
        1200, // maxWidth
        1200, // maxHeight
        'JPEG',
        80, // quality
        0, // rotation
        undefined, // outputPath
        false, // keepMeta
        {
          mode: 'contain',
          onlyScaleDown: true,
        }
      );

      console.log('ImagePickerService: Image resized:', resizedImage);

      return {
        uri: resizedImage.uri,
        name: asset.fileName || `payment_proof_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: resizedImage.size || asset.fileSize,
        width: resizedImage.width,
        height: resizedImage.height,
        originalUri: asset.uri,
      };
    } catch (error) {
      console.error('ImagePickerService: Error processing image:', error);
      
      // Return original asset if resize fails
      return {
        uri: asset.uri,
        name: asset.fileName || `payment_proof_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        originalUri: asset.uri,
      };
    }
  }

  /**
   * Show image picker options
   */
  showImagePickerOptions(onImageSelected) {
    Alert.alert(
      'Pilih Bukti Pembayaran',
      'Pilih sumber gambar untuk bukti pembayaran',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Kamera',
          onPress: async () => {
            const result = await this.openCamera();
            if (result.success) {
              onImageSelected(result.data);
            } else if (result.message !== 'Camera cancelled') {
              Alert.alert('Error', result.message);
            }
          },
        },
        {
          text: 'Galeri',
          onPress: async () => {
            const result = await this.openGallery();
            if (result.success) {
              onImageSelected(result.data);
            } else if (result.message !== 'Gallery cancelled') {
              Alert.alert('Error', result.message);
            }
          },
        },
      ],
      {cancelable: true}
    );
  }

  /**
   * Validate image file
   */
  validateImage(image) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (!image) {
      return {valid: false, message: 'No image provided'};
    }

    if (image.size > maxSize) {
      return {valid: false, message: 'Image size must be less than 10MB'};
    }

    if (!allowedTypes.includes(image.type)) {
      return {valid: false, message: 'Only JPEG and PNG images are allowed'};
    }

    return {valid: true};
  }
}

export default new ImagePickerService();
