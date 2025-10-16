import { supabase } from '../supabaseClient';

// 1. 이미지 업로드
export const uploadImage = async (file, bucketName = 'images') => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        res_code: 400,
        res_msg: '지원되지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 허용)'
      };
    }

    // 파일 크기 검증 (5MB 제한)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        res_code: 400,
        res_msg: '파일 크기가 너무 큽니다. (최대 5MB)'
      };
    }

    // 고유한 파일명 생성
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Supabase Storage에 파일 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 업로드된 파일의 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return {
      res_code: 201,
      res_msg: '이미지가 성공적으로 업로드되었습니다',
      image_url: publicUrl,
      file_size: file.size,
      content_type: file.type
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 2. 여러 이미지 업로드
export const uploadMultipleImages = async (files, bucketName = 'images') => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    if (!files || files.length === 0) {
      return {
        res_code: 400,
        res_msg: '업로드할 파일이 없습니다'
      };
    }

    // 최대 5개 파일 제한
    if (files.length > 5) {
      return {
        res_code: 400,
        res_msg: '한 번에 최대 5개의 파일만 업로드할 수 있습니다'
      };
    }

    const uploadResults = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const result = await uploadImage(files[i], bucketName);
      
      if (result.res_code === 201) {
        uploadResults.push({
          index: i,
          image_url: result.image_url,
          file_size: result.file_size,
          content_type: result.content_type
        });
      } else {
        errors.push({
          index: i,
          file_name: files[i].name,
          error: result.res_msg
        });
      }
    }

    return {
      res_code: 200,
      res_msg: `${uploadResults.length}개의 파일이 업로드되었습니다`,
      uploaded_files: uploadResults,
      errors: errors
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 3. 이미지 삭제
export const deleteImage = async (imageUrl, bucketName = 'images') => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // URL에서 파일명 추출
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const userFolder = `${user.id}/${fileName}`;

    // 파일 삭제
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([userFolder]);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: '이미지가 성공적으로 삭제되었습니다'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

// 4. 사용자의 모든 이미지 조회
export const getUserImages = async (bucketName = 'images') => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: '인증이 필요합니다'
      };
    }

    // 사용자 폴더의 모든 파일 조회
    const { data: files, error: filesError } = await supabase.storage
      .from(bucketName)
      .list(user.id);

    if (filesError) throw filesError;

    const imageFiles = files.filter(file => 
      file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );

    const images = imageFiles.map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(`${user.id}/${file.name}`);

      return {
        name: file.name,
        url: publicUrl,
        size: file.metadata?.size,
        created_at: file.created_at
      };
    });

    return {
      res_code: 200,
      res_msg: '사용자 이미지 목록 조회 성공',
      images: images
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};
