import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Select, DatePicker, Card, Row, Col, message, Alert, Upload, Space, Image } from 'antd';
import { ArrowLeftOutlined, InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { productAPI, categoryAPI, imageAPI } from '../services/api';
import dayjs from 'dayjs';
import { extractCreatedProductId } from '../utils/apiResponse';
import { normalizeCategoriesResponse, normalizeProductsResponse } from '../utils/safeData';

interface CategoryOption {
  id: number;
  name: string;
}

interface UploadedImage {
  file: File;
  preview: string;
  id?: number;
}

interface SellerProductFormValues {
  title: string;
  description: string;
  start_price: number;
  min_increment?: number;
  category_id: number;
  start_time?: dayjs.Dayjs;
  end_time?: dayjs.Dayjs;
}

const API_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';
const MIN_AUCTION_DURATION_MINUTES = 30;

export const SellerPostProductPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const watchedStartTime = Form.useWatch('start_time', form) as dayjs.Dayjs | undefined;

  useEffect(() => {
    const currentEndTime = form.getFieldValue('end_time') as dayjs.Dayjs | undefined;
    if (!watchedStartTime) {
      return;
    }

    const minimumEndTime = watchedStartTime.add(MIN_AUCTION_DURATION_MINUTES, 'minute');
    if (!currentEndTime || !currentEndTime.isAfter(minimumEndTime.subtract(1, 'millisecond'))) {
      form.setFieldsValue({ end_time: minimumEndTime });
    }
  }, [form, watchedStartTime]);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Vui lòng đăng nhập để đăng bán sản phẩm');
      navigate('/login');
    }
  }, [navigate]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoryLoading(true);
        const response = await categoryAPI.getAll();
        const categoryData = normalizeCategoriesResponse(response.data);

        setCategories(
          categoryData.map((cat) => ({
            id: cat.category_id,
            name: cat.name,
          }))
        );
      } catch (error: unknown) {
        console.error('Error loading categories:', error);
        message.error('Không thể tải danh mục sản phẩm');
        setCategories([]);
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const resolveCreatedProductId = async (
    createPayload: unknown,
    draft: {
      title: string;
      description: string;
      category_id: number;
    }
  ): Promise<number | null> => {
    const idFromCreateResponse = extractCreatedProductId(createPayload);
    if (idFromCreateResponse) {
      return idFromCreateResponse;
    }

    try {
      const myProductsResponse = await productAPI.getMyProducts();
      const myProducts = normalizeProductsResponse(myProductsResponse.data);
      if (!myProducts.length) {
        return null;
      }

      const normalizedTitle = draft.title.trim().toLowerCase();
      const normalizedDescription = draft.description.trim().toLowerCase();

      const exactMatch = myProducts.find((item) => {
        return (
          item.title.trim().toLowerCase() === normalizedTitle &&
          item.description.trim().toLowerCase() === normalizedDescription &&
          item.category_id === draft.category_id
        );
      });

      if (exactMatch) {
        return exactMatch.product_id;
      }

      const sameTitleCandidates = myProducts
        .filter((item) => item.title.trim().toLowerCase() === normalizedTitle)
        .sort((a, b) => b.product_id - a.product_id);

      if (sameTitleCandidates.length > 0) {
        return sameTitleCandidates[0].product_id;
      }

      const newestProduct = [...myProducts].sort((a, b) => b.product_id - a.product_id)[0];
      return newestProduct?.product_id ?? null;
    } catch (error) {
      console.error('Fallback getMyProducts failed:', error);
      return null;
    }
  };

  const onFinish = async (values: SellerProductFormValues) => {
    try {
      setLoading(true);

      // Validate images
      if (uploadedImages.length === 0) {
        message.error('Vui lòng chọn ít nhất một ảnh');
        setLoading(false);
        return;
      }

      if (!values.start_time || !values.end_time) {
        message.error('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc');
        setLoading(false);
        return;
      }

      const startTime = values.start_time;
      const endTime = values.end_time;

      if (!endTime.isAfter(startTime)) {
        message.error('Thời gian kết thúc phải sau thời gian bắt đầu');
        setLoading(false);
        return;
      }

      if (endTime.diff(startTime, 'minute') < MIN_AUCTION_DURATION_MINUTES) {
        message.error(`Phiên đấu giá phải kéo dài tối thiểu ${MIN_AUCTION_DURATION_MINUTES} phút`);
        setLoading(false);
        return;
      }

      const productData = {
        title: values.title,
        description: values.description,
        start_price: values.start_price,
        min_increment: values.min_increment || 1000,
        category_id: values.category_id,
        start_time: startTime.format(API_DATETIME_FORMAT),
        end_time: endTime.format(API_DATETIME_FORMAT),
      };

      // Step 1: Create product with first image (backend supports image upload on create)
      const createFormData = new FormData();
      createFormData.append('title', String(productData.title));
      createFormData.append('description', String(productData.description));
      createFormData.append('start_price', String(productData.start_price));
      createFormData.append('min_increment', String(productData.min_increment));
      createFormData.append('category_id', String(productData.category_id));
      createFormData.append('start_time', String(productData.start_time));
      createFormData.append('end_time', String(productData.end_time));
      createFormData.append('image', uploadedImages[0].file);

      const productResponse = await productAPI.createProduct(createFormData);
      const productId = await resolveCreatedProductId(productResponse.data, {
        title: productData.title,
        description: productData.description,
        category_id: productData.category_id,
      });

      if (!productId) {
        throw new Error(`Khong lay duoc productId tu response/create flow: ${JSON.stringify(productResponse.data)}`);
      }

      console.log('Product created with ID:', productId);

      // Step 2: Upload remaining images
      if (uploadedImages.length > 1) {
        try {
          for (let i = 1; i < uploadedImages.length; i++) {
            const image = uploadedImages[i];
            const formData = new FormData();
            // Backend accepts both image/file. Use image for consistency with create endpoint.
            formData.append('image', image.file);
            formData.append('product_id', productId.toString());
            formData.append('is_primary', 'false');
            
            // Upload image
            await imageAPI.upload(formData);
            console.log(`Image ${i + 1} uploaded`);
          }
          console.log('All images uploaded successfully');
        } catch (imageError) {
          console.error('Error uploading images:', imageError);
          message.warning('Sản phẩm đã được tạo nhưng có lỗi khi tải ảnh. Bạn có thể thêm ảnh sau.');
        }
      }

      message.success('Đăng sản phẩm thành công!');
      form.resetFields();
      setUploadedImages([]);
      
      // Redirect to product detail after 1.5 seconds
      setTimeout(() => {
        navigate(`/product/${productId}`);
      }, 1500);
    } catch (error: unknown) {
      console.error('Error posting product:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Không thể đăng sản phẩm. Vui lòng thử lại.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Vui lòng chọn file ảnh');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.error('Kích thước ảnh không vượt quá 5MB');
      return false;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadedImages([...uploadedImages, {
          file,
          preview: e.target.result as string,
        }]);
        message.success('Ảnh đã được thêm');
      }
    };
    reader.readAsDataURL(file);

    return false; // Prevent default upload behavior
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    message.info('Ảnh đã được xóa');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', minHeight: '600px' }}>
      {/* Header */}
      <Row style={{ marginBottom: '24px', alignItems: 'center' }}>
        <Col>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ marginRight: '16px' }}
          >
            Quay lại
          </Button>
        </Col>
        <Col>
          <h1 style={{ margin: 0 }}>📦 Đăng bán sản phẩm</h1>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title="Thông tin sản phẩm"
            variant="borderless"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <Alert
              title="💡 Hướng dẫn"
              description="Điền đầy đủ thông tin sản phẩm để tăng khả năng được mua. Hình ảnh và mô tả chi tiết sẽ giúp thu hút nhiều người mua."
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              autoComplete="off"
              requiredMark="optional"
            >
              {/* Tên sản phẩm */}
              <Form.Item
                label="Tên sản phẩm"
                name="title"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên sản phẩm' },
                  { min: 5, message: 'Tên sản phẩm phải từ 5 ký tự trở lên' },
                  { max: 150, message: 'Tên sản phẩm không vượt quá 150 ký tự' },
                ]}
              >
                <Input
                  placeholder="Ví dụ: iPhone 14 Pro Max - Trắng - 128GB"
                  size="large"
                />
              </Form.Item>

              {/* Danh mục */}
              <Form.Item
                label="Danh mục"
                name="category_id"
                rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
              >
                <Select
                  placeholder="Chọn danh mục sản phẩm"
                  size="large"
                  loading={categoryLoading}
                  options={categories.map((cat) => ({
                    label: cat.name,
                    value: cat.id,
                  }))}
                />
              </Form.Item>

              {/* Mô tả */}
              <Form.Item
                label="Mô tả sản phẩm"
                name="description"
                rules={[
                  { required: true, message: 'Vui lòng nhập mô tả sản phẩm' },
                  { min: 20, message: 'Mô tả phải từ 20 ký tự trở lên' },
                ]}
              >
                <Input.TextArea
                  rows={5}
                  placeholder="Mô tả chi tiết về sản phẩm: điều kiện, tính năng, lý do bán, v.v."
                  showCount
                  maxLength={2000}
                />
              </Form.Item>

              {/* Giá khởi điểm */}
              <Form.Item
                label="Giá khởi điểm (VNĐ)"
                name="start_price"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá khởi điểm' },
                  {
                    type: 'number',
                    min: 1000,
                    message: 'Giá khởi điểm phải lớn hơn 1.000 VNĐ',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="10000"
                  min={1000}
                  step={1000}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>

              {/* Mức tăng giá tối thiểu */}
              <Form.Item
                label="Mức tăng giá tối thiểu (VNĐ)"
                name="min_increment"
                initialValue={1000}
                rules={[
                  { required: true, message: 'Vui lòng nhập mức tăng giá' },
                  {
                    type: 'number',
                    min: 1000,
                    message: 'Mức tăng giá phải lớn hơn 1.000 VNĐ',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="1000"
                  min={1000}
                  step={1000}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>

              {/* Ngày bắt đầu */}
              <Form.Item
                label="Ngày bắt đầu"
                name="start_time"
                initialValue={dayjs()}
                rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  size="large"
                  disabledDate={(current) => Boolean(current && current < dayjs().startOf('day'))}
                />
              </Form.Item>

              <Form.Item
                label="Ngày kết thúc"
                name="end_time"
                initialValue={dayjs().add(MIN_AUCTION_DURATION_MINUTES, 'minute')}
                dependencies={['start_time']}
                rules={[
                  { required: true, message: 'Vui lòng chọn ngày kết thúc' },
                  ({ getFieldValue }) => ({
                    validator(_, value?: dayjs.Dayjs) {
                      const startTime = getFieldValue('start_time') as dayjs.Dayjs | undefined;

                      if (!value || !startTime) {
                        return Promise.resolve();
                      }

                      if (!value.isAfter(startTime)) {
                        return Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu'));
                      }

                      if (value.diff(startTime, 'minute') < MIN_AUCTION_DURATION_MINUTES) {
                        return Promise.reject(
                          new Error(`Phiên đấu giá phải kéo dài tối thiểu ${MIN_AUCTION_DURATION_MINUTES} phút`)
                        );
                      }

                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  size="large"
                  disabledDate={(current) => Boolean(current && current < dayjs().startOf('day'))}
                  disabledTime={(current) => {
                    const startTime = form.getFieldValue('start_time') as dayjs.Dayjs | undefined;
                    if (!startTime || !current || !current.isSame(startTime, 'day')) {
                      return {};
                    }

                    const minEnd = startTime.add(MIN_AUCTION_DURATION_MINUTES, 'minute');
                    return {
                      disabledHours: () =>
                        Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => hour < minEnd.hour()),
                      disabledMinutes: (selectedHour) => {
                        if (selectedHour !== minEnd.hour()) {
                          return [];
                        }
                        return Array.from({ length: 60 }, (_, minute) => minute).filter(
                          (minute) => minute < minEnd.minute()
                        );
                      },
                    };
                  }}
                />
              </Form.Item>



              {/* Ảnh sản phẩm */}
              <Form.Item
                label="Ảnh sản phẩm"
                required
                rules={[{ required: true, message: 'Vui lòng chọn ít nhất một ảnh sản phẩm' }]}
                valuePropName="images"
              >
                <div style={{
                  padding: '24px',
                  border: uploadedImages.length > 0 ? '2px dashed #52c41a' : '2px dashed #1890ff',
                  borderRadius: '8px',
                  textAlign: 'center',
                  backgroundColor: uploadedImages.length > 0 ? '#f6ffed' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#40a9ff';
                    e.currentTarget.style.backgroundColor = '#e6f7ff';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1890ff';
                    e.currentTarget.style.backgroundColor = '#fafafa';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#1890ff';
                    e.currentTarget.style.backgroundColor = '#fafafa';
                    if (e.dataTransfer.files.length > 0) {
                      handleImageUpload(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <Upload.Dragger
                    accept="image/*"
                    maxCount={1}
                    beforeUpload={handleImageUpload}
                    showUploadList={false}
                    style={{ padding: 0, margin: 0 }}
                  >
                    <p style={{ fontSize: '40px' }}>
                      <InboxOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>Kéo ảnh vào đây hoặc click để chọn</p>
                    <p style={{ color: '#666', fontSize: '14px' }}>Hỗ trợ: JPG, PNG, GIF. Tối đa 5MB/ảnh</p>
                  </Upload.Dragger>
                </div>
              </Form.Item>

              {/* Danh sách ảnh đã chọn */}
              {uploadedImages.length > 0 && (
                <Form.Item label="Ảnh đã chọn">
                  <Space wrap style={{ width: '100%' }}>
                    {uploadedImages.map((image, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}>
                        <Image
                          src={image.preview}
                          width={100}
                          height={100}
                          style={{ objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.45)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '2px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                          }}
                        >
                          <DeleteOutlined /> Xóa
                        </button>
                      </div>
                    ))}
                  </Space>
                </Form.Item>
              )}

            

              {/* Submit Button */}
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loading}
                  block
                  style={{
                    background: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)',
                    borderRadius: '6px',
                    height: '48px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  {loading ? 'Đang đăng...' : '✨ Đăng bán sản phẩm'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Right Sidebar - Tips */}
        <Col xs={24} lg={8}>
          <Card
            title="💡 Mẹo để bán nhanh"
            variant="borderless"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#666' }}>
              <li>✅ Chụp ảnh rõ nét, sáng tối hợp lý</li>
              <li>✅ Viết tiêu đề sản phẩm chi tiết, rõ ràng</li>
              <li>✅ Mô tả chính xác tình trạng sản phẩm</li>
              <li>✅ Đặt giá khớp hợp với thị trường</li>
              <li>✅ Trả lời nhanh chóng các câu hỏi của người mua</li>
              <li>✅ Giao dịch qua chương trình bảo vệ</li>
            </ul>
          </Card>

          <Card
            title="📋 Yêu cầu"
            variant="borderless"
            style={{ marginTop: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#666', fontSize: '14px' }}>
              <li>Tài khoản đã xác thực</li>
              <li>Tài khoản không bị khóa</li>
              <li>Sản phẩm hợp pháp</li>
              <li>Mô tả chính xác, không gian dối</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SellerPostProductPage;
