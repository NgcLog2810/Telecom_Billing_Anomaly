from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import traceback
import io

app = Flask(__name__)
CORS(app)

# 1. Load Model và các công cụ hỗ trợ
try:
    model = joblib.load('model_random_forest.pkl')
    scaler = joblib.load('data_scaler.pkl')
    features = joblib.load('feature_columns.pkl')
    print(f"✅ AI Server Online! Model yêu cầu các cột: {features}")
except Exception as e:
    print(f"❌ Lỗi load file mô hình: {e}")

# 2. Mapping dữ liệu từ chữ sang số (Khớp với logic huấn luyện)
MAPPINGS = {
    'gender': {'Female': 0, 'Male': 1},
    'Partner': {'No': 0, 'Yes': 1},
    'Dependents': {'No': 0, 'Yes': 1},
    'InternetService': {'DSL': 0, 'Fiber optic': 1, 'No': 2},
    'Contract': {'Month-to-month': 0, 'One year': 1, 'Two year': 2},
    'PaymentMethod': {
        'Bank transfer (automatic)': 0, 'Credit card (automatic)': 1,
        'Electronic check': 2, 'Mailed check': 3
    }
}

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        print(f"--- Dữ liệu nhận từ Web: {data}")

        # Khởi tạo DataFrame với đúng danh sách cột mô hình yêu cầu (tất cả = 0)
        df_final = pd.DataFrame(0, index=[0], columns=features)

        # 3. Ánh xạ dữ liệu từ React (tenure) sang Model (Tenure)
        # Chúng ta gán thủ công để đảm bảo khớp hoàn hảo tên cột viết hoa/thường
        df_final['Tenure'] = pd.to_numeric(data.get('tenure'), errors='coerce') or 0
        df_final['MonthlyCharges'] = pd.to_numeric(data.get('MonthlyCharges'), errors='coerce') or 0
        df_final['TotalCharges'] = pd.to_numeric(data.get('TotalCharges'), errors='coerce') or 0

        # Ánh xạ các cột phân loại (Dựa trên key từ React gửi lên)
        category_map = {
            'Gender': 'Gender',
            'InternetService': 'InternetService',
            'Contract': 'Contract',
            'PaymentMethod': 'PaymentMethod'
        }

        for react_key, model_key in category_map.items():
            if model_key in df_final.columns:
                val = data.get(react_key)
                mapping_dict = MAPPINGS.get(react_key, {})
                df_final.at[0, model_key] = mapping_dict.get(val, 0)

        # Điền các cột còn thiếu (Partner, Dependents...) nếu có trong data
        for key in ['Partner', 'Dependents']:
            if key in df_final.columns:
                df_final.at[0, key] = MAPPINGS['Partner'].get(data.get(key.lower()), 0)

        # 4. Chuẩn hóa (Scaling) các cột số
        num_cols_to_scale = ['Tenure', 'MonthlyCharges', 'TotalCharges']
        # Chỉ scale nếu các cột này thực sự tồn tại trong danh sách features của model
        cols_present = [c for c in num_cols_to_scale if c in df_final.columns]
        if cols_present:
            df_final[cols_present] = scaler.transform(df_final[cols_present])

        # 5. Thực hiện dự báo
        prob = model.predict_proba(df_final)[0]
        prediction = int(np.argmax(prob))
        
        print(f"--- Kết quả: {'Bất thường' if prediction == 1 else 'Bình thường'} ({round(prob[1]*100, 1)}%)")

        return jsonify({
            "status": "success",
            "prediction": "Anomaly" if prediction == 1 else "Normal",
            "risk_score": round(prob[1] * 100, 1),
            "confidence": round(float(np.max(prob)) * 100, 1)
        })
    except Exception as e:
        print("❌ Lỗi xử lý dự báo:")
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 400
    

@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    try:
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "Không tìm thấy file"}), 400
        
        file = request.files['file']
        df_input = pd.read_csv(file)
        
        results = []
        for _, row in df_input.iterrows():
            # Tạo DF trống với đủ cột features
            df_row = pd.DataFrame(0, index=[0], columns=features)
            
            # Mapping dữ liệu từ file (Giả định file có tên cột khớp hoặc ta map lại)
            df_row['Tenure'] = pd.to_numeric(row.get('Tenure', 0))
            df_row['MonthlyCharges'] = pd.to_numeric(row.get('MonthlyCharges', 0))
            df_row['TotalCharges'] = pd.to_numeric(row.get('TotalCharges', 0))
            for react_key, model_key in {
                'gender': 'Gender',
                'InternetService': 'InternetService',
                'Contract': 'Contract',
                'PaymentMethod': 'PaymentMethod',
            }.items():
                if model_key in df_row.columns:
                    val = row.get(react_key, '')
                    mapping_dict = MAPPINGS.get(react_key, {})
                    df_row.at[0, model_key] = mapping_dict.get(val, 0)
            for key in ['Partner', 'Dependents']:
                if key in df_row.columns:
                    # Dùng chung mapping của Partner vì cùng là Yes/No
                    df_row.at[0, key] = MAPPINGS['Partner'].get(row.get(key, 'No'), 0)

            # Xử lý các giá trị thiếu hoặc không hợp lệ
            for col in ['Tenure', 'MonthlyCharges', 'TotalCharges']:
                if pd.isna(df_row.at[0, col]):
                    df_row.at[0, col] = 0   
                else:
                    df_row.at[0, col] = pd.to_numeric(df_row.at[0, col], errors='coerce') or 0
            
            # Scale và Predict
            df_row[['Tenure', 'MonthlyCharges', 'TotalCharges']] = scaler.transform(df_row[['Tenure', 'MonthlyCharges', 'TotalCharges']])
            prob = model.predict_proba(df_row)[0]
            
            results.append({
                "Customer": row.get('customerID', 'Unknown'),
                "Risk": f"{round(prob[1]*100, 1)}%",
                "Status": "Anomaly" if np.argmax(prob) == 1 else "Normal"
            })
            
        return jsonify({"status": "success", "data": results})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Chạy Flask ở port 5000
    app.run(port=5000, debug=True)