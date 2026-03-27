import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input, InputNumber, Button, notification, Upload } from "antd";
import { useCreateProduct, useUpdateProduct } from "../../hooks/useProducts";
import { UploadOutlined } from "@ant-design/icons";

// We use Zod matching the backend validator
const productSchema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().optional(),
  price: z.number().min(0.01, "Price must be > 0"),
  stock: z.number().min(0, "Stock cannot be negative"),
});

const ProductForm = ({ initialData, onSuccess }) => {
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();

  const isPending = isCreating || isUpdating;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData ? parseFloat(initialData.price) : 0,
      stock: initialData?.stock || 0,
    },
  });

  // AntD Upload doesn't play perfectly with native FileLists out of the box in strict mode, 
  // so we intercept the custom request to avoid attempting to auto-upload to nowhere by antd
  const dummyRequest = ({ file, onSuccess: rcOnSuccess }) => {
    setTimeout(() => {
      rcOnSuccess("ok");
    }, 0);
  };

  const onSubmit = (data) => {
    // The backend uses Multer `upload.single('image')`. We need a FormData.
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    formData.append("price", data.price.toString());
    formData.append("stock", data.stock.toString());

    // Pull the internal file object from AntD's Upload component if present
    if (data.imageFile) {
        formData.append("image", data.imageFile.originFileObj);
    }

    if (initialData?.id) {
      updateProduct(
        { id: initialData.id, data: formData },
        {
          onSuccess: () => {
            notification.success({ message: "Product updated!" });
            onSuccess();
          },
          onError: (err) => notification.error({ message: "Update failed", description: err.message })
        }
      );
    } else {
      createProduct(formData, {
        onSuccess: () => {
          notification.success({ message: "Product created!" });
          onSuccess();
        },
        onError: (err) => notification.error({ message: "Creation failed", description: err.message })
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 flex flex-col h-full">
      <div className="flex-1 space-y-5">
        
        {/* Image Upload specifically requested by user via gap analysis */}
        <div>
          <label className="block text-label-md font-medium text-on-surface uppercase tracking-wide mb-1.5">
            Product Image
          </label>
          <Controller
            name="imageFile"
            control={control}
            render={({ field }) => (
              <Upload.Dragger
                name="file"
                multiple={false}
                maxCount={1}
                customRequest={dummyRequest}
                onChange={(info) => {
                  field.onChange(info.fileList[0]);
                }}
                className="bg-surface-dim border-none"
              >
                <p className="ant-upload-drag-icon">
                  <UploadOutlined className="text-primary opacity-60" />
                </p>
                <p className="ant-upload-text text-on-surface-muted text-sm px-4">
                  Drag & Drop Image Upload
                </p>
              </Upload.Dragger>
            )}
          />
        </div>

        <div>
           <label className="block text-label-md font-medium text-on-surface uppercase tracking-wide mb-1.5">
             Product Name
           </label>
           <Controller
             name="name"
             control={control}
             render={({ field }) => (
               <Input {...field} size="large" className="ghost-border" status={errors.name ? 'error' : ''}/>
             )}
           />
           {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="flex gap-4">
            <div className="flex-1">
                <label className="block text-label-md font-medium text-on-surface uppercase tracking-wide mb-1.5">
                 Price (₹)
               </label>
               <Controller
                 name="price"
                 control={control}
                 render={({ field }) => (
                   <InputNumber {...field} size="large" className="ghost-border w-full" status={errors.price ? 'error' : ''}/>
                 )}
               />
               {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>
            <div className="flex-1">
                <label className="block text-label-md font-medium text-on-surface uppercase tracking-wide mb-1.5">
                 Stock Qty
               </label>
               <Controller
                 name="stock"
                 control={control}
                 render={({ field }) => (
                   <InputNumber {...field} size="large" className="ghost-border w-full" status={errors.stock ? 'error' : ''}/>
                 )}
               />
               {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock.message}</p>}
            </div>
        </div>

        <div>
           <label className="block text-label-md font-medium text-on-surface uppercase tracking-wide mb-1.5">
             Description (Optional)
           </label>
           <Controller
             name="description"
             control={control}
             render={({ field }) => (
               <Input.TextArea {...field} rows={4} className="ghost-border" />
             )}
           />
        </div>

      </div>

      <div className="pt-6 border-t border-surface-border">
          <Button
            type="primary"
            htmlType="submit"
            className="w-full h-11 gradient-primary border-0 font-semibold shadow-none"
            loading={isPending}
          >
            {initialData ? "Save Changes" : "Create Product"}
          </Button>
      </div>
    </form>
  );
};

export default ProductForm;
